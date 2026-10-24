// Requires Chrome 111+ — "world": "MAIN" supported in manifest content_scripts
// chrome.storage is NOT used here — see bridge.ts (ISOLATED world) for storage access

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
  async: boolean = true,
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

  const matched = rule

  const respond = async () => {
    if (matched.delayMs > 0) await sleep(matched.delayMs)

    Object.defineProperties(this, {
      readyState:   { configurable: true, get: () => 4 },
      status:       { configurable: true, get: () => matched.statusCode },
      statusText:   { configurable: true, get: () => String(matched.statusCode) },
      responseText: { configurable: true, get: () => matched.responseBody },
      response:     { configurable: true, get: () => matched.responseBody },
    })

    // Fire in correct order: readystatechange → load → loadend
    const rscEvt = new Event('readystatechange')
    this.dispatchEvent(rscEvt)
    if (typeof this.onreadystatechange === 'function') this.onreadystatechange.call(this, rscEvt)

    const loadEvt = new ProgressEvent('load', { lengthComputable: false, loaded: 0, total: 0 })
    this.dispatchEvent(loadEvt)
    if (typeof this.onload === 'function') this.onload.call(this, loadEvt)

    const endEvt = new ProgressEvent('loadend', { lengthComputable: false, loaded: 0, total: 0 })
    this.dispatchEvent(endEvt)
    if (typeof this.onloadend === 'function') this.onloadend.call(this, endEvt)
  }

  respond()
}

// ─── Receive rules from the ISOLATED world bridge via postMessage ────────────
// chrome.storage is NOT reliable in MAIN world on all pages (the host page's
// own JS can shadow/overwrite the chrome global). The bridge.ts content script
// runs in the ISOLATED world where chrome APIs are always available, and it
// forwards rules here via window.postMessage.

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data
  if (!data || data.__source !== '__ninja_interceptor_bridge__') return
  if (Array.isArray(data.rules))    rules    = data.rules
  if (data.settings != null)        settings = data.settings
})
