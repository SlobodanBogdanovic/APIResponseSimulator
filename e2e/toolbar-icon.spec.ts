import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BrowserContext, Worker } from '@playwright/test'
import {
  createRule,
  expect,
  extensionServiceWorker,
  openExtensionPage,
  readExtensionState,
  ruleCard,
  test,
} from './extension'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(repoRoot, 'dist')

const ON_ICON = { '16': 'icons/icon-16.png', '32': 'icons/icon-32.png' }
const OFF_ICON = { '16': 'icons/icon-16-off.png', '32': 'icons/icon-32-off.png' }
const ON_TOOLTIP = 'API Response Simulator: ON'
const OFF_TOOLTIP = 'API Response Simulator: OFF'

const ARTWORK: Array<{ file: string; pixels: number; sha256: string }> = [
  { file: 'icon-16.png', pixels: 16, sha256: '05ab514dd84fdeba320d263744051b368323f0ce82aeec669b86b98afcee391c' },
  { file: 'icon-32.png', pixels: 32, sha256: 'bbcfa723c986dea585c128d059a846a29d7f2476d84dfe9e00b495616efe706a' },
  { file: 'icon-48.png', pixels: 48, sha256: '3361c1764537fa725fca9d1a5609ef0fa99c53aef0d7a1abd76fe622f5cb3731' },
  { file: 'icon-128.png', pixels: 128, sha256: '55ea230467b778af8b3991d6d08f9f275c583e67f1af32b7d483d27cb9935f37' },
  { file: 'icon-16-off.png', pixels: 16, sha256: 'afee26421150af2044310eba1eb2d99419df9a1c55eaa6641b85bae4a7896788' },
  { file: 'icon-32-off.png', pixels: 32, sha256: '8f83c08fc098fb1044716a9011e8c88877a6c385b55d159735edd7850b4242e1' },
  { file: 'icon-48-off.png', pixels: 48, sha256: '92f05af8a73ac874fb83cba0344ef450f631bc4159411a4f1f878825994303ce' },
  { file: 'icon-128-off.png', pixels: 128, sha256: '5a7b90ecc614ed629f5c04ffd580056f77194ddd89f221daeb8a99ab4d4c4f59' },
  { file: 'master-512.png', pixels: 512, sha256: '8e07eb2e3a9c91a6351d1f4a04fbdcf7799fe08343820d1de32e8e3b25ffdd34' },
]

const SHIPPED_ICONS = [
  'icon-16.png',
  'icon-32.png',
  'icon-48.png',
  'icon-128.png',
  'icon-16-off.png',
  'icon-32-off.png',
]

const SOLID_SQUARE_FILES = ['icon16.png', 'icon48.png', 'icon128.png']

interface IconCall {
  path?: Record<string, string>
  tabId?: number
  imageData?: unknown
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function pngSize(filePath: string): { width: number; height: number } {
  const bytes = readFileSync(filePath)
  const type = bytes.subarray(12, 16).toString('ascii')
  if (type !== 'IHDR') throw new Error(`${filePath} has no IHDR chunk`)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function iconSnapshot(call: IconCall | undefined): string {
  const pathMap = call?.path
  const keys = pathMap ? Object.keys(pathMap).sort() : []
  const sorted: Record<string, string> = {}
  for (const key of keys) sorted[key] = pathMap?.[key] ?? ''
  return JSON.stringify({
    tabId: call !== undefined && Object.prototype.hasOwnProperty.call(call, 'tabId'),
    imageData: call !== undefined && Object.prototype.hasOwnProperty.call(call, 'imageData'),
    path: call ? sorted : null,
  })
}

function usesOnGlyph(call: IconCall): boolean {
  return Object.values(call.path ?? {}).some(
    (value) => value === ON_ICON['16'] || value === ON_ICON['32'],
  )
}

async function installIconSpy(worker: Worker, mode: 'passthrough' | 'failure'): Promise<void> {
  const installed = await worker.evaluate((spyMode) => {
    const g = globalThis as unknown as {
      __iconCalls?: IconCall[]
      __swErrors?: string[]
      __iconFailure?: 'throw' | 'reject'
      chrome: {
        action: {
          setIcon: (details: IconCall, callback?: () => void) => unknown
        }
      }
      addEventListener?: (
        type: string,
        listener: (event: { message?: string; error?: unknown; reason?: unknown }) => void,
      ) => void
    }
    g.__iconCalls = []
    g.__swErrors = []
    g.__iconFailure = 'throw'
    const original = g.chrome.action.setIcon.bind(g.chrome.action)
    const wrapped = (details: IconCall, callback?: () => void) => {
      g.__iconCalls?.push(JSON.parse(JSON.stringify(details)) as IconCall)
      if (spyMode === 'failure') {
        if (g.__iconFailure === 'reject') return Promise.reject(new Error('setIcon failed'))
        throw new Error('setIcon failed')
      }
      if (typeof callback === 'function') return original(details, callback)
      return original(details)
    }
    try {
      g.chrome.action.setIcon = wrapped
    } catch {
      // The binding may be non-writable. defineProperty is the second attempt.
    }
    if (g.chrome.action.setIcon !== wrapped) {
      try {
        Object.defineProperty(g.chrome.action, 'setIcon', {
          configurable: true,
          writable: true,
          value: wrapped,
        })
      } catch {
        return false
      }
    }
    if (spyMode === 'failure' && typeof g.addEventListener === 'function') {
      g.addEventListener('error', (event) => {
        const error = event.error
        const message = error instanceof Error ? error.message : (event.message ?? 'error')
        g.__swErrors?.push(message)
      })
      g.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason
        g.__swErrors?.push(reason instanceof Error ? reason.message : String(reason))
      })
    }
    return g.chrome.action.setIcon === wrapped
  }, mode)
  expect(installed).toBe(true)
}

async function readIconCalls(worker: Worker): Promise<IconCall[]> {
  return worker.evaluate(() => {
    const g = globalThis as unknown as { __iconCalls?: IconCall[] }
    return g.__iconCalls ?? []
  })
}

async function readSwErrors(worker: Worker): Promise<string[]> {
  return worker.evaluate(() => {
    const g = globalThis as unknown as { __swErrors?: string[] }
    return g.__swErrors ?? []
  })
}

async function clearIconCalls(worker: Worker): Promise<void> {
  await worker.evaluate(() => {
    const g = globalThis as unknown as { __iconCalls?: IconCall[] }
    g.__iconCalls = []
  })
}

async function setIconFailureMode(worker: Worker, mode: 'throw' | 'reject'): Promise<void> {
  await worker.evaluate((next) => {
    const g = globalThis as unknown as {
      __iconCalls?: IconCall[]
      __swErrors?: string[]
      __iconFailure?: 'throw' | 'reject'
    }
    g.__iconCalls = []
    g.__swErrors = []
    g.__iconFailure = next
  }, mode)
}

interface ToolbarStorageView {
  settingsPresent: boolean
  extensionEnabled: boolean | null
  badgeText: string
  title: string
}

function settledToolbar(enabled: boolean): ToolbarStorageView {
  return {
    settingsPresent: true,
    extensionEnabled: enabled,
    badgeText: enabled ? 'ON' : 'OFF',
    title: enabled ? ON_TOOLTIP : OFF_TOOLTIP,
  }
}

// readExtensionState fills extensionEnabled: true when the settings key is
// missing, which is also the badge the startup paint uses before install
// stores settings. That guess is not proof the install handler has finished.
async function readToolbarStorage(worker: Worker): Promise<ToolbarStorageView> {
  return worker.evaluate(async () => {
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
      chromeApi.storage.local.get(['settings'], resolve)
    })
    const badgeText = await new Promise<string>((resolve) => {
      chromeApi.action.getBadgeText({}, resolve)
    })
    const title = await new Promise<string>((resolve) => {
      chromeApi.action.getTitle({}, resolve)
    })

    const settingsPresent = Object.prototype.hasOwnProperty.call(stored, 'settings')
    const settings = stored['settings']
    let extensionEnabled: boolean | null = null
    if (settingsPresent && settings !== null && typeof settings === 'object') {
      const value = (settings as { extensionEnabled?: unknown }).extensionEnabled
      if (typeof value === 'boolean') extensionEnabled = value
    }
    return { settingsPresent, extensionEnabled, badgeText, title }
  })
}

// Startup chrome.storage.local.get can finish after a clear and record the
// colored paths. Settle until that call has been drained, then the failed
// paint is the only setIcon left in the log. A missing recorded call is fine:
// the spy can be installed after the startup paint.
async function settleToolbarBeforeFailedPaint(worker: Worker, enabled: boolean): Promise<void> {
  const expected = JSON.stringify(settledToolbar(enabled))
  await expect.poll(async () => JSON.stringify(await readToolbarStorage(worker))).toBe(expected)

  await clearIconCalls(worker)

  // One empty read can win the race against an in-flight startup callback.
  // A second empty read means no call arrived after the clear that followed
  // the first quiet look.
  let quietPolls = 0
  await expect.poll(async () => {
    const before = await readIconCalls(worker)
    if (before.length > 0) {
      await clearIconCalls(worker)
      quietPolls = 0
      return 'late'
    }
    const view = await readToolbarStorage(worker)
    const after = await readIconCalls(worker)
    if (after.length > 0) {
      await clearIconCalls(worker)
      quietPolls = 0
      return 'late'
    }
    if (JSON.stringify(view) !== expected) {
      quietPolls = 0
      return 'drift'
    }
    quietPolls += 1
    return quietPolls >= 2 ? 'quiet' : 'holding'
  }).toBe('quiet')
}

async function writeEnabled(worker: Worker, enabled: boolean): Promise<void> {
  await worker.evaluate((value) => {
    const g = globalThis as unknown as {
      chrome: {
        storage: {
          local: {
            set: (items: Record<string, unknown>, callback?: () => void) => void
          }
        }
      }
    }
    g.chrome.storage.local.set({ settings: { extensionEnabled: value } }, () => undefined)
  }, enabled)
}

async function expectIconWithinOneSecond(worker: Worker, paths: Record<string, string>): Promise<void> {
  const expected = iconSnapshot({ path: paths })
  await expect.poll(async () => {
    const calls = await readIconCalls(worker)
    if (calls.length === 0) return 'no setIcon call yet'
    const snapshots = calls.map((call) => iconSnapshot(call))
    const unique = [...new Set(snapshots)]
    return unique.length === 1 ? unique[0] : snapshots.join('\n')
  }, { timeout: 1_000 }).toBe(expected)
}

async function expectRuleTogglesLeaveIcon(
  context: BrowserContext,
  extensionId: string,
  worker: Worker,
  paths: Record<string, string>,
): Promise<void> {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '200',
    responseBody: '{"source":"mock"}',
  })
  const popup = await openExtensionPage(context, extensionId, 'popup')
  await expect(popup.getByText('1 of 1 rule active', { exact: true })).toBeVisible()
  await popup.getByTestId('popup-rule-toggle').click()
  await expect(popup.getByText('0 of 1 rule active', { exact: true })).toBeVisible()
  const afterPopupRule = await readExtensionState(worker)
  expect(afterPopupRule.settings.extensionEnabled).toBe(true)
  const afterPopupCalls = await readIconCalls(worker)
  expect(iconSnapshot(afterPopupCalls[afterPopupCalls.length - 1])).toBe(iconSnapshot({ path: paths }))

  await options.close()
  const refreshedOptions = await openExtensionPage(context, extensionId, 'options')
  const ruleToggle = ruleCard(refreshedOptions, 'Users').getByTestId('rule-enabled-toggle')
  await expect(ruleToggle).toHaveAttribute('title', 'Enable rule')
  await ruleToggle.click()
  await expect.poll(async () => {
    const state = await readExtensionState(worker)
    return state.rules.find((rule) => rule.name === 'Users')?.enabled
  }).toBe(true)
  const afterCard = await readExtensionState(worker)
  expect(afterCard.settings.extensionEnabled).toBe(true)
  const afterCardCalls = await readIconCalls(worker)
  expect(iconSnapshot(afterCardCalls[afterCardCalls.length - 1])).toBe(iconSnapshot({ path: paths }))
}

test('AC-1: manifest icons and default_icon point at the colored glyphs', async () => {
  const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf8')) as {
    icons?: Record<string, string>
    action?: { default_icon?: Record<string, string>; default_popup?: string }
    permissions?: string[]
    host_permissions?: string[]
  }
  expect(manifest.icons).toEqual({
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  })
  expect(manifest.action?.default_icon).toEqual({
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
  })
  const listed = [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ]
  for (const relative of listed) {
    expect(existsSync(path.join(distDir, relative)), relative).toBe(true)
  }
  expect(manifest.action?.default_popup).toBe('popup/index.html')
  expect(manifest.permissions).toEqual(['storage'])
  expect(manifest.host_permissions).toEqual([
    '<all_urls>',
    'http://localhost/*',
    'https://localhost/*',
  ])
})

test('AC-2: toolbar icon paths follow the global switch within one second', async ({ context, extensionId }) => {
  const worker = extensionServiceWorker(context, extensionId)
  await installIconSpy(worker, 'passthrough')

  const popupOff = await openExtensionPage(context, extensionId, 'popup')
  await expect(popupOff.getByTestId('global-toggle')).toHaveAttribute('title', 'Disable extension')
  await clearIconCalls(worker)
  await popupOff.getByTestId('global-toggle').click()
  const closingOff = popupOff.close()
  await expectIconWithinOneSecond(worker, OFF_ICON)
  await closingOff
  const offState = await readExtensionState(worker)
  expect(offState.settings.extensionEnabled).toBe(false)

  const popupOn = await openExtensionPage(context, extensionId, 'popup')
  await clearIconCalls(worker)
  await popupOn.getByTestId('global-toggle').click()
  const closingOn = popupOn.close()
  await expectIconWithinOneSecond(worker, ON_ICON)
  await closingOn
  const onState = await readExtensionState(worker)
  expect(onState.settings.extensionEnabled).toBe(true)

  await expectRuleTogglesLeaveIcon(context, extensionId, worker, ON_ICON)
})

test('AC-4: badge, tooltip, and setIcon paths match one boolean', async ({ context, extensionId }) => {
  const worker = extensionServiceWorker(context, extensionId)
  await installIconSpy(worker, 'passthrough')
  const popup = await openExtensionPage(context, extensionId, 'popup')
  const toggle = popup.getByTestId('global-toggle')

  await clearIconCalls(worker)
  await toggle.click()
  await expectIconWithinOneSecond(worker, OFF_ICON)
  const offState = await readExtensionState(worker)
  expect(offState.settings.extensionEnabled).toBe(false)
  expect(offState.badgeText).toBe('OFF')
  expect(offState.title).toBe(OFF_TOOLTIP)

  await clearIconCalls(worker)
  await toggle.click()
  await expectIconWithinOneSecond(worker, ON_ICON)
  const onState = await readExtensionState(worker)
  expect(onState.settings.extensionEnabled).toBe(true)
  expect(onState.badgeText).toBe('ON')
  expect(onState.title).toBe(ON_TOOLTIP)

  const matches: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.name.endsWith('.js')) continue
      if (readFileSync(full, 'utf8').includes('setIcon')) {
        matches.push(path.relative(distDir, full).split(path.sep).join('/'))
      }
    }
  }
  walk(distDir)
  expect(matches.sort()).toEqual(['background/service-worker.js'])
})

test('AC-5: artwork hashes match the table and the build copies those bytes', async () => {
  for (const row of ARTWORK) {
    const filePath = path.join(repoRoot, 'assets/icons', row.file)
    expect(sha256(filePath), row.file).toBe(row.sha256)
    expect(pngSize(filePath), row.file).toEqual({ width: row.pixels, height: row.pixels })
  }
  for (const name of SHIPPED_ICONS) {
    const fromDist = path.join(distDir, 'icons', name)
    expect(existsSync(fromDist), `dist/icons/${name}`).toBe(true)
    expect(sha256(fromDist), name).toBe(sha256(path.join(repoRoot, 'assets/icons', name)))
  }
  const readmePath = path.join(repoRoot, 'assets/icons/README.md')
  expect(existsSync(readmePath), 'assets/icons/README.md').toBe(true)
  const readme = readFileSync(readmePath, 'utf8')
  expect(readme).toContain('JetBrains Mono')
  expect(readme).toContain('SIL Open Font License')
  expect(readme).toContain('must not be edited by hand')
})

test('AC-6: setIcon uses OFF paths when disabled', async ({ context, extensionId }) => {
  const worker = extensionServiceWorker(context, extensionId)
  await installIconSpy(worker, 'passthrough')
  const popup = await openExtensionPage(context, extensionId, 'popup')
  const toggle = popup.getByTestId('global-toggle')
  await expect(toggle).toHaveAttribute('title', 'Disable extension')

  await clearIconCalls(worker)
  await toggle.click()
  await expectIconWithinOneSecond(worker, OFF_ICON)

  await clearIconCalls(worker)
  await toggle.click()
  await expectIconWithinOneSecond(worker, ON_ICON)

  await expectRuleTogglesLeaveIcon(context, extensionId, worker, ON_ICON)
})

test('AC-7: solid-square filenames are absent from dist and the manifest', async () => {
  for (const name of SOLID_SQUARE_FILES) {
    expect(existsSync(path.join(distDir, 'icons', name)), `dist/icons/${name}`).toBe(false)
  }
  const manifestText = readFileSync(path.join(distDir, 'manifest.json'), 'utf8')
  for (const name of SOLID_SQUARE_FILES) {
    expect(manifestText, name).not.toContain(name)
  }
  const workerText = readFileSync(path.join(distDir, 'background/service-worker.js'), 'utf8')
  for (const name of SOLID_SQUARE_FILES) {
    expect(workerText, name).not.toContain(name)
  }
})

test('AC-9: a failed setIcon keeps the badge and tooltip for the stored switch', async ({ context, extensionId }) => {
  const worker = extensionServiceWorker(context, extensionId)
  const consoleErrors: string[] = []
  worker.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await installIconSpy(worker, 'failure')

  const expectFailedPaint = async (enabled: boolean) => {
    const badge = enabled ? 'ON' : 'OFF'
    const title = enabled ? ON_TOOLTIP : OFF_TOOLTIP
    await expect.poll(async () => {
      const state = await readExtensionState(worker)
      const calls = await readIconCalls(worker)
      const swErrors = await readSwErrors(worker)
      return JSON.stringify({
        badge: state.badgeText,
        title: state.title,
        // An off paint must not try the colored paths. An on paint may try them once.
        offAvoidedOnPaths: enabled || !calls.some((call) => usesOnGlyph(call)),
        swErrors,
        consoleErrors,
      })
    }, { timeout: 1_000 }).toEqual(JSON.stringify({
      badge,
      title,
      offAvoidedOnPaths: true,
      swErrors: [] as string[],
      consoleErrors: [] as string[],
    }))
    const later = await readExtensionState(worker)
    expect(later.badgeText).toBe(badge)
    expect(later.title).toBe(title)
  }

  await settleToolbarBeforeFailedPaint(worker, true)
  consoleErrors.length = 0
  await setIconFailureMode(worker, 'throw')
  await writeEnabled(worker, false)
  await expectFailedPaint(false)

  await settleToolbarBeforeFailedPaint(worker, false)
  consoleErrors.length = 0
  await setIconFailureMode(worker, 'throw')
  await writeEnabled(worker, true)
  await expectFailedPaint(true)

  await settleToolbarBeforeFailedPaint(worker, true)
  consoleErrors.length = 0
  await setIconFailureMode(worker, 'reject')
  await writeEnabled(worker, false)
  await expectFailedPaint(false)

  await settleToolbarBeforeFailedPaint(worker, false)
  consoleErrors.length = 0
  await setIconFailureMode(worker, 'reject')
  await writeEnabled(worker, true)
  await expectFailedPaint(true)
})
