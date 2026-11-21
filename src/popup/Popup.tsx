import { useEffect, useState } from 'react'
import type { MockRule, ExtensionSettings } from '../shared/types'
import { getRules, toggleRule, getSettings, saveSettings } from '../shared/storage'
import { PowerSwitch, primaryButtonClass } from '../shared/ui'

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
        <p className="text-meta text-secondary">Loading…</p>
      </div>
    )
  }

  const extensionOn = settings.extensionEnabled

  return (
    <div className="popup-shell flex min-h-0 flex-col bg-panel text-ink">
      <div className="flex flex-nowrap items-center gap-2 border-b border-line px-3 py-3">
        <span className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">API Response Simulator</span>
        <span
          data-testid="extension-state"
          className={`shrink-0 text-ui font-semibold ${extensionOn ? 'text-signal' : 'text-ink'}`}
        >
          {extensionOn ? 'On' : 'Off'}
        </span>
        <PowerSwitch
          live={extensionOn}
          on={extensionOn}
          label={extensionOn ? 'Disable extension' : 'Enable extension'}
          title={extensionOn ? 'Disable extension' : 'Enable extension'}
          testId="global-toggle"
          onClick={handleGlobalToggle}
        />
      </div>

      <div className="flex flex-col gap-1 px-3 py-2">
        <p className="text-meta font-semibold text-ink">
          {activeCount} of {rules.length} rule{rules.length !== 1 ? 's' : ''} active
        </p>
        {!extensionOn && (
          <p data-testid="extension-disabled" className="text-meta font-semibold text-ink">
            (extension disabled)
          </p>
        )}
      </div>

      <div data-testid="popup-rule-list" className="max-h-64 overflow-y-auto px-3 py-2">
        {rules.length === 0 ? (
          <div>
            <p className="text-ui text-ink">No rules yet.</p>
            <p className="text-meta text-secondary">Open settings to add one.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rules.map((rule) => {
              const intercepting = extensionOn && rule.enabled
              const powerClass = !extensionOn ? 'text-secondary' : rule.enabled ? 'text-signal' : 'text-ink'
              return (
                <li
                  key={rule.id}
                  data-testid="popup-rule"
                  data-rule-name={rule.name}
                  className={`popup-row flex items-center justify-between gap-2 py-1 ${intercepting ? 'popup-row-live' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-ui font-medium ${intercepting ? 'text-ink' : 'text-secondary'}`}>
                      {rule.name}
                    </p>
                    <p className="truncate font-mono text-meta text-secondary">{rule.urlPattern}</p>
                  </div>
                  <span data-testid="rule-power" className={`shrink-0 text-ui font-semibold ${powerClass}`}>
                    {rule.enabled ? 'On' : 'Off'}
                  </span>
                  <PowerSwitch
                    live={intercepting}
                    on={rule.enabled}
                    label={rule.enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
                    testId="popup-rule-toggle"
                    onClick={() => handleRuleToggle(rule.id, !rule.enabled)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-line p-3">
        <button
          data-testid="open-settings"
          type="button"
          onClick={handleOpenSettings}
          className={`${primaryButtonClass} w-full`}
        >
          Open settings
        </button>
      </div>
    </div>
  )
}
