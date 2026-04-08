// Requires Chrome 102+ — chrome.storage available in MAIN world content scripts
// Requires Chrome 111+ — "world": "MAIN" supported in manifest content_scripts

// ─── Inline types (no imports allowed in IIFE build) ───────────────────────

interface MockRule {
  id: string
  name: string
  enabled: boolean
  method: string
  urlPattern: string
  statusCode: number
  responseBody: string
  responseHeaders: Array<{ key: string; value: string }>
  delayMs: number
}

interface Settings { extensionEnabled: boolean }

// ─── State ─────────────────────────────────────────────────────────────────

let rules: MockRule[] = []
let settings: Settings = { extensionEnabled: true }

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(escaped, 'i')
}

// Strip protocol so "localhost:8080/api/*" matches "http://localhost:8080/api/users"
function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

function findMatch(method: string, url: string): MockRule | null {
  const normalized = normalizeUrl(url)
  for (const rule of rules) {
    if (!rule.enabled) continue
    const methodOk = rule.method === 'ANY' || rule.method.toUpperCase() === method.toUpperCase()
    if (!methodOk) continue
    const re = globToRegex(rule.urlPattern)
    if (re.test(url) || re.test(normalized)) return rule
  }
  return null
}

function buildHeaders(rule: MockRule): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  for (const { key, value } of rule.responseHeaders) {
    if (key.trim()) h[key] = value
  }
  return h
}

// ─── fetch patch (synchronous — runs before page JS) ──────────────────────

const _originalFetch = window.fetch.bind(window)

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!settings.extensionEnabled) return _originalFetch(input, init)

  const url = input instanceof Request ? input.url
            : input instanceof URL     ? input.href
            : String(input)
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

  const rule = findMatch(method, url)
  if (rule) {
    if (rule.delayMs > 0) await sleep(rule.delayMs)
    return new Response(rule.responseBody, {
      status: rule.statusCode,
      statusText: String(rule.statusCode),
      headers: buildHeaders(rule)
    })
  }
  return _originalFetch(input, init)
}

// ─── XHR patch via prototype (more reliable than subclassing) ─────────────

const _originalOpen = XMLHttpRequest.prototype.open
const _originalSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function(
  method: string,
  url: string | URL,
  async = true,
  user?: string | null,
  password?: string | null
) {
  ;(this as any).__mockMethod = method.toUpperCase()
  ;(this as any).__mockUrl   = url instanceof URL ? url.href : String(url)
  _originalOpen.call(this, method, url, async, user ?? null, password ?? null)
}

XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
  if (!settings.extensionEnabled) { _originalSend.call(this, body); return }

  const rule = findMatch(
    (this as any).__mockMethod ?? 'GET',
    (this as any).__mockUrl   ?? ''
  )
  if (!rule) { _originalSend.call(this, body); return }

  const self = this

  async function respond() {
    if (rule.delayMs > 0) await sleep(rule.delayMs)

    Object.defineProperties(self, {
      readyState:   { configurable: true, get: () => 4 },
      status:       { configurable: true, get: () => rule.statusCode },
      statusText:   { configurable: true, get: () => String(rule.statusCode) },
      responseText: { configurable: true, get: () => rule.responseBody },
      response:     { configurable: true, get: () => rule.responseBody },
    })

    // Fire in correct order: readystatechange → load → loadend
    const rscEvt = new Event('readystatechange')
    self.dispatchEvent(rscEvt)
    if (typeof self.onreadystatechange === 'function') self.onreadystatechange.call(self, rscEvt)

    const loadEvt = new ProgressEvent('load', { lengthComputable: false, loaded: 0, total: 0 })
    self.dispatchEvent(loadEvt)
    if (typeof self.onload === 'function') self.onload.call(self, loadEvt)

    const endEvt = new ProgressEvent('loadend', { lengthComputable: false, loaded: 0, total: 0 })
    self.dispatchEvent(endEvt)
    if (typeof self.onloadend === 'function') self.onloadend.call(self, endEvt)
  }

  respond()
}

// ─── Load rules async (patch already applied above with empty rules) ────────

chrome.storage.local.get(['rules', 'settings'], (result) => {
  rules    = result['rules']    ?? []
  settings = result['settings'] ?? { extensionEnabled: true }
})

// ─── Sync on change — update variables only, never re-run patch code ────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes['rules'])    rules    = changes['rules'].newValue    ?? []
  if (changes['settings']) settings = changes['settings'].newValue ?? { extensionEnabled: true }
})
