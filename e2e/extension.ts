import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  chromium,
  expect,
  test as base,
  type BrowserContext,
  type Download,
  type Locator,
  type Page,
  type Worker,
} from '@playwright/test'

const extensionPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

export const PROBE_ORIGIN = 'http://127.0.0.1:4173'

export interface ProbeResult {
  status: number
  body: string
  contentType: string | null
  mockHeader: string | null
  serverHeader: string | null
  events: string[]
}

export interface StoredRule {
  id: string
  name: string
  enabled: boolean
  method: string
  urlPattern: string
  statusCode: number
  responseBody: string
  responseHeaders: Array<{ key: string; value: string }>
}

export interface ExtensionState {
  rules: StoredRule[]
  settings: { extensionEnabled: boolean }
  badgeText: string
  title: string
}

export interface RuleInput {
  name: string
  urlPattern: string
  method: string
  statusCode: string
  responseBody: string
  delayMs?: string
  headers?: Array<{ key: string; value: string }>
}

function forwardSlash(filePath: string): string {
  return filePath.replaceAll('\\', '/')
}

// This Chromium build's preference HMAC seed is empty. Chrome signs
// extensions.ui.developer_mode as HMAC-SHA256(device id + path + JSON value).
// Windows device id is the machine SID. Linux Chromium has no device id.
let cachedDeviceId: string | undefined

function machineDeviceId(): string {
  if (cachedDeviceId !== undefined) return cachedDeviceId
  cachedDeviceId = process.platform === 'win32' ? windowsMachineSid() : ''
  return cachedDeviceId
}

function windowsMachineSid(): string {
  // Same lookup Chromium uses: the computer account SID, not the user SID.
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class MachineSid {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool GetComputerNameW(StringBuilder buf, ref int size);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool LookupAccountNameW(string system, string account, byte[] sid, ref int sidSize, StringBuilder domain, ref int domainSize, out int use);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool ConvertSidToStringSidW(byte[] sid, out IntPtr str);
  [DllImport("kernel32.dll")]
  public static extern IntPtr LocalFree(IntPtr h);
  public static string Get() {
    var name = new StringBuilder(256);
    int nameSize = name.Capacity;
    if (!GetComputerNameW(name, ref nameSize)) throw new System.Exception("GetComputerNameW failed");
    int sidSize = 68;
    var sid = new byte[sidSize];
    var domain = new StringBuilder(256);
    int domainSize = domain.Capacity;
    int use;
    if (!LookupAccountNameW(null, name.ToString(), sid, ref sidSize, domain, ref domainSize, out use)) {
      sid = new byte[sidSize];
      domain = new StringBuilder(domainSize);
      if (!LookupAccountNameW(null, name.ToString(), sid, ref sidSize, domain, ref domainSize, out use))
        throw new System.Exception("LookupAccountNameW failed");
    }
    IntPtr str;
    if (!ConvertSidToStringSidW(sid, out str)) throw new System.Exception("ConvertSidToStringSidW failed");
    string result = Marshal.PtrToStringUni(str);
    LocalFree(str);
    return result;
  }
}
"@
[MachineSid]::Get()
`
  const sid = execFileSync('powershell', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim()
  if (!/^S-1-\d+(-\d+)+$/.test(sid)) {
    throw new Error(`Could not read the Windows machine SID (got ${JSON.stringify(sid)})`)
  }
  return sid
}

function preferenceMac(deviceId: string, prefPath: string, value: string): string {
  return createHmac('sha256', Buffer.alloc(0)).update(deviceId).update(prefPath).update(value).digest('hex').toUpperCase()
}

function objectAt(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const current = parent[key]
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    return current as Record<string, unknown>
  }
  const created: Record<string, unknown> = {}
  parent[key] = created
  return created
}

// chrome.runtime.reload() disables a --load-extension extension unless
// developer mode is already on. The protected pref is written before launch.
// The encrypted hash is removed so Chrome checks the legacy HMAC, which this
// build still accepts.
async function enableDeveloperModeInProfile(userDataDir: string): Promise<void> {
  const file = path.join(userDataDir, 'Default', 'Secure Preferences')
  await mkdir(path.dirname(file), { recursive: true })
  let prefs: Record<string, unknown> = {}
  if (existsSync(file)) {
    prefs = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
  }
  const extensions = objectAt(prefs, 'extensions')
  const ui = objectAt(extensions, 'ui')
  ui.developer_mode = true
  const protection = objectAt(prefs, 'protection')
  const macs = objectAt(protection, 'macs')
  const macExtensions = objectAt(macs, 'extensions')
  const macUi = objectAt(macExtensions, 'ui')
  macUi.developer_mode = preferenceMac(machineDeviceId(), 'extensions.ui.developer_mode', 'true')
  delete macUi.developer_mode_encrypted_hash
  await writeFile(file, JSON.stringify(prefs))
}

function cssAttributeValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function serverBody(method: string, requestPath: string): string {
  return JSON.stringify({ source: 'server', method, path: requestPath })
}

export function ruleCard(page: Page, name: string): Locator {
  return page.locator(`[data-testid="rule-card"][data-rule-name=${cssAttributeValue(name)}]`)
}

export function popupRule(page: Page, name: string): Locator {
  return page.locator(`[data-testid="popup-rule"][data-rule-name=${cssAttributeValue(name)}]`)
}

// Headless choice: Playwright's Chromium (channel: 'chromium'), headless: true,
// launchPersistentContext, --disable-extensions-except, and --load-extension.
// That is the new-headless Chromium path Playwright documents for extensions.
// xvfb-run is not used.
export async function launchExtension(userDataDir: string): Promise<BrowserContext> {
  const manifestPath = path.join(extensionPath, 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`Extension build not found at ${extensionPath}. Run npm run build first.`)
  }
  if (!existsSync(userDataDir)) {
    throw new Error(`Profile directory does not exist: ${userDataDir}`)
  }

  await enableDeveloperModeInProfile(userDataDir)

  const extensionDir = forwardSlash(extensionPath)
  const profileDir = forwardSlash(userDataDir)
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  })

  // chrome-extension: and blob: are not routed, so those requests proceed.
  // Routing them and calling continue() stalls the service worker. Other
  // http(s) hosts are aborted. Aborted browser traffic does not fail the test.
  await context.route(/^https?:/i, async (route) => {
    let hostname = ''
    try {
      hostname = new URL(route.request().url()).hostname
    } catch {
      // Not a URL. Abort it below.
    }
    if (hostname === '127.0.0.1' || hostname === 'localhost') await route.continue()
    else await route.abort()
  })

  return context
}

export async function createProfileDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'api-response-simulator-'))
}

export async function deleteProfileDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}

export async function extensionIdFrom(context: BrowserContext): Promise<string> {
  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15_000 })
  }
  const extensionId = new URL(serviceWorker.url()).host
  if (!extensionId) {
    throw new Error(`Could not read extension id from ${serviceWorker.url()}`)
  }
  return extensionId
}

export function extensionServiceWorker(context: BrowserContext, extensionId: string): Worker {
  const worker = context.serviceWorkers().find((candidate) => new URL(candidate.url()).host === extensionId)
  if (!worker) {
    throw new Error('Service worker is not running')
  }
  return worker
}

export async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  which: 'popup' | 'options',
): Promise<Page> {
  const page = await context.newPage()
  const pagePath = which === 'popup' ? 'popup/index.html' : 'options/index.html'
  await page.goto(`chrome-extension://${extensionId}/${pagePath}`)
  return page
}

export async function openProbe(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`${PROBE_ORIGIN}/`)
  await expect(page.getByTestId('probe-result')).toHaveAttribute('data-seq', '0')
  return page
}

export async function readExtensionState(serviceWorker: Worker): Promise<ExtensionState> {
  return serviceWorker.evaluate(async () => {
    const chromeApi = (globalThis as unknown as {
      chrome: {
        storage: {
          local: {
            get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void
          }
        }
        action: {
          getBadgeText: (details: object, callback: (result: string) => void) => void
          getTitle: (details: object, callback: (result: string) => void) => void
        }
      }
    }).chrome

    const stored = await new Promise<Record<string, unknown>>((resolve) => {
      chromeApi.storage.local.get(['rules', 'settings'], resolve)
    })
    const badgeText = await new Promise<string>((resolve) => {
      chromeApi.action.getBadgeText({}, resolve)
    })
    const title = await new Promise<string>((resolve) => {
      chromeApi.action.getTitle({}, resolve)
    })

    const rules = Array.isArray(stored['rules']) ? stored['rules'] : []
    const settings =
      stored['settings'] && typeof stored['settings'] === 'object'
        ? stored['settings']
        : { extensionEnabled: true }

    return { rules, settings, badgeText, title }
  }) as Promise<ExtensionState>
}

export async function reloadExtensionFromServiceWorker(context: BrowserContext, extensionId: string): Promise<void> {
  const worker = extensionServiceWorker(context, extensionId)
  await worker.evaluate(() => {
    const chromeApi = (globalThis as unknown as {
      chrome: { runtime: { reload: () => void } }
    }).chrome
    chromeApi.runtime.reload()
  }).catch(() => undefined)

  await expect.poll(async () => {
    const workers = context.serviceWorkers().filter((candidate) => {
      try {
        return new URL(candidate.url()).host === extensionId
      } catch {
        return false
      }
    })
    for (const candidate of workers) {
      try {
        const id = await candidate.evaluate(() => {
          const chromeApi = (globalThis as unknown as {
            chrome: { runtime: { id: string } }
          }).chrome
          return chromeApi.runtime.id
        })
        if (id === extensionId) return id
      } catch {
        // The worker that called reload is closing.
      }
    }
    return `down:${workers.length}`
  }).toBe(extensionId)
}

export async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(globalThis as { __probeMark?: number }).__probeMark = 1
  })
}

export async function expectPageNotReloaded(page: Page): Promise<void> {
  const mark = await page.evaluate(() => (globalThis as { __probeMark?: number }).__probeMark)
  expect(mark).toBe(1)
}

export async function createRule(page: Page, rule: RuleInput): Promise<void> {
  await page.getByTestId('add-rule').click()
  await page.getByTestId('rule-name').fill(rule.name)
  await page.getByTestId('rule-url-pattern').fill(rule.urlPattern)
  await page.getByTestId('rule-method').selectOption(rule.method)
  await page.getByTestId('rule-status-code').fill(rule.statusCode)
  await page.getByTestId('rule-response-body').fill(rule.responseBody)
  if (rule.delayMs !== undefined) {
    await page.getByTestId('rule-delay').fill(rule.delayMs)
  }
  for (const header of rule.headers ?? []) {
    await page.getByTestId('add-header').click()
    const row = page.getByTestId('header-row').last()
    await row.getByTestId('header-key').fill(header.key)
    await row.getByTestId('header-value').fill(header.value)
  }
  await page.getByTestId('save-rule').click()
  await expect(ruleCard(page, rule.name)).toBeVisible()
}

export async function clickProbe(page: Page, testId: string): Promise<ProbeResult> {
  const result = page.getByTestId('probe-result')
  const before = (await result.getAttribute('data-seq')) ?? '0'
  await page.getByTestId(testId).click()
  await page.waitForFunction(
    (prev) => {
      const root = (globalThis as unknown as {
        document: { querySelector: (selector: string) => { getAttribute: (name: string) => string | null } | null }
      }).document
      const el = root.querySelector('[data-testid="probe-result"]')
      return !!el && el.getAttribute('data-seq') !== prev
    },
    before,
    { timeout: 10_000 },
  )
  return JSON.parse(await result.innerText()) as ProbeResult
}

export async function pollProbe(page: Page, testId: string, expected: Partial<ProbeResult>): Promise<void> {
  const keys = Object.keys(expected) as Array<keyof ProbeResult>
  await expect.poll(async () => {
    try {
      const actual = await clickProbe(page, testId)
      const picked: Record<string, unknown> = {}
      for (const key of keys) picked[key] = actual[key]
      return JSON.stringify(picked)
    } catch {
      return 'pending'
    }
  }).toBe(JSON.stringify(expected))
}

export async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function importRulesFile(page: Page, contents: string, fileName: string): Promise<void> {
  await page.getByTestId('import-file').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  })
}

type ExtensionFixtures = {
  context: BrowserContext
  extensionId: string
  userDataDir: string
}

export { expect }

export const test = base.extend<ExtensionFixtures>({
  userDataDir: async ({}, use) => {
    const dir = await createProfileDir()
    try {
      await use(dir)
    } finally {
      await deleteProfileDir(dir)
    }
  },
  context: async ({ userDataDir }, use) => {
    const context = await launchExtension(userDataDir)
    try {
      await use(context)
    } finally {
      await context.close()
    }
  },
  extensionId: async ({ context }, use) => {
    const extensionId = await extensionIdFrom(context)
    await use(extensionId)
  },
})
