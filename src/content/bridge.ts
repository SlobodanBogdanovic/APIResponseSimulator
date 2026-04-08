// Runs in ISOLATED world — chrome APIs always available here.
// Bridges storage data to the MAIN world interceptor via window.postMessage.

const MSG_SOURCE = '__ninja_interceptor_bridge__'

// Send current rules + settings as soon as storage responds
chrome.storage.local.get(['rules', 'settings'], (result) => {
  window.postMessage({
    __source: MSG_SOURCE,
    type: 'INIT',
    rules:    result['rules']    ?? [],
    settings: result['settings'] ?? { extensionEnabled: true }
  }, '*')
})

// Forward any subsequent storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  const msg: Record<string, unknown> = { __source: MSG_SOURCE, type: 'UPDATE' }
  if (changes['rules'])    msg.rules    = changes['rules'].newValue    ?? []
  if (changes['settings']) msg.settings = changes['settings'].newValue ?? { extensionEnabled: true }
  window.postMessage(msg, '*')
})
