chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings', 'rules'], (result) => {
    const updates: Record<string, unknown> = {}
    if (!result['settings']) updates['settings'] = { extensionEnabled: true }
    if (!result['rules'])    updates['rules']    = []
    if (Object.keys(updates).length) chrome.storage.local.set(updates)
  })
})

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'OPEN_OPTIONS') chrome.runtime.openOptionsPage()
})
