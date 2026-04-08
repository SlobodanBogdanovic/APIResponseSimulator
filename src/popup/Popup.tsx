import { useEffect, useState } from 'react'
import type { MockRule, ExtensionSettings } from '../shared/types'
import { getRules, toggleRule, getSettings, saveSettings } from '../shared/storage'

export function Popup() {
  const [rules, setRules] = useState<MockRule[]>([])
  const [settings, setSettings] = useState<ExtensionSettings>({ extensionEnabled: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getRules(), getSettings()]).then(([r, s]) => {
      setRules(r)
      setSettings(s)
      setLoading(false)
    })
  }, [])

  const handleGlobalToggle = async () => {
    const updated = { ...settings, extensionEnabled: !settings.extensionEnabled }
    setSettings(updated)
    await saveSettings(updated)
  }

  const handleRuleToggle = async (id: string, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)))
    await toggleRule(id, enabled)
  }

  const handleOpenSettings = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
  }

  const activeCount = rules.filter((r) => r.enabled).length

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-indigo-600">
        <span className="text-sm font-semibold text-white">API Mock Interceptor</span>
        <button
          onClick={handleGlobalToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            settings.extensionEnabled ? 'bg-indigo-300' : 'bg-gray-400'
          }`}
          title={settings.extensionEnabled ? 'Disable extension' : 'Enable extension'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              settings.extensionEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs text-gray-500">
          {activeCount} of {rules.length} rule{rules.length !== 1 ? 's' : ''} active
        </span>
        {!settings.extensionEnabled && (
          <span className="ml-2 text-xs text-amber-600 font-medium">(extension disabled)</span>
        )}
      </div>

      {/* Rule list */}
      <div className="flex-1 overflow-y-auto max-h-64">
        {rules.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <p className="text-xs text-gray-400 text-center">
              No rules yet.<br />Open settings to add one.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-800 truncate">{rule.name}</p>
                  <p className="text-xs text-gray-400 truncate">{rule.urlPattern}</p>
                </div>
                <button
                  onClick={() => handleRuleToggle(rule.id, !rule.enabled)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                    rule.enabled ? 'bg-indigo-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                      rule.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={handleOpenSettings}
          className="w-full text-sm text-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          Open settings
        </button>
      </div>
    </div>
  )
}
