import type { MockRule, ExtensionSettings } from './types'

export function getRules(): Promise<MockRule[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['rules'], (result) => {
      resolve((result['rules'] as MockRule[]) ?? [])
    })
  })
}

export function saveRules(rules: MockRule[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ rules }, resolve)
  })
}

export function addRule(rule: MockRule): Promise<void> {
  return getRules().then((rules) => saveRules([...rules, rule]))
}

export function updateRule(updated: MockRule): Promise<void> {
  return getRules().then((rules) =>
    saveRules(rules.map((r) => (r.id === updated.id ? updated : r)))
  )
}

export function deleteRule(id: string): Promise<void> {
  return getRules().then((rules) => saveRules(rules.filter((r) => r.id !== id)))
}

export function toggleRule(id: string, enabled: boolean): Promise<void> {
  return getRules().then((rules) =>
    saveRules(rules.map((r) => (r.id === id ? { ...r, enabled } : r)))
  )
}

export function getSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve((result['settings'] as ExtensionSettings) ?? { extensionEnabled: true })
    })
  })
}

export function saveSettings(s: ExtensionSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings: s }, resolve)
  })
}
