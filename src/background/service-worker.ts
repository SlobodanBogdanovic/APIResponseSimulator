// Incremented whenever a newer toolbar value is known. A storage read captures
// the value at the start and paints only if it is still current, so a slower
// read cannot cover a later settings change.
let toolbarPaintGeneration = 0

function paintToolbarStatus(on: boolean): void {
  chrome.action.setBadgeText({ text: on ? 'ON' : 'OFF' })
  chrome.action.setBadgeBackgroundColor({ color: on ? '#137333' : '#5F6368' })
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' })
  chrome.action.setTitle({
    title: on ? 'API Response Simulator: ON' : 'API Response Simulator: OFF',
  })
  chrome.action.setIcon({
    path: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  })
}

// Absent settings (never stored, deleted, or null) is ON. A present value uses
// the same truthiness rule as the popup switch: truthy extensionEnabled is ON,
// and false, a missing field, null, 0, and "" are OFF.
function isExtensionOn(settings: unknown): boolean {
  if (settings == null || typeof settings !== 'object') return settings == null
  return Boolean((settings as { extensionEnabled?: unknown }).extensionEnabled)
}

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function paintToolbarFromStorage(): void {
  const generation = ++toolbarPaintGeneration
  let settled = false
  const finish = (on: boolean) => {
    if (settled || generation !== toolbarPaintGeneration) return
    settled = true
    paintToolbarStatus(on)
  }

  try {
    const returned: unknown = chrome.storage.local.get('settings', (items) => {
      if (chrome.runtime.lastError || items == null) {
        finish(true)
        return
      }
      try {
        finish(isExtensionOn(items.settings))
      } catch {
        finish(true)
      }
    })
    if (isThenable(returned)) {
      void returned.then(
        () => undefined,
        () => finish(true),
      )
    }
  } catch {
    finish(true)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings', 'rules'], (result) => {
    const updates: Record<string, unknown> = {}
    if (!result['settings']) updates['settings'] = { extensionEnabled: true }
    if (!result['rules'])    updates['rules']    = []
    if (Object.keys(updates).length) chrome.storage.local.set(updates)
  })
  paintToolbarFromStorage()
})

chrome.runtime.onStartup.addListener(() => {
  paintToolbarFromStorage()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !('settings' in changes)) return
  ++toolbarPaintGeneration
  paintToolbarStatus(isExtensionOn(changes.settings?.newValue))
})

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OPEN_OPTIONS') chrome.runtime.openOptionsPage()
})

paintToolbarFromStorage()
