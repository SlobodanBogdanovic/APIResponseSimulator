import { useState } from 'react'
import type { MockRule } from '../../shared/types'
import { PowerSwitch, confirmButtonClass, dangerButtonClass, secondaryButtonClass } from '../../shared/ui'

interface RuleCardProps {
  rule: MockRule
  onEdit: (rule: MockRule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

const METHOD_TEXT: Record<string, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  DELETE: 'text-method-delete',
  PATCH: 'text-method-patch',
  ANY: 'text-method-any',
}

export function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
  const [confirming, setConfirming] = useState(false)

  const handleDeleteClick = () => setConfirming(true)
  const handleConfirm = () => {
    setConfirming(false)
    onDelete(rule.id)
  }
  const handleCancelDelete = () => setConfirming(false)

  const methodText = METHOD_TEXT[rule.method] ?? 'text-method-any'

  return (
    <div
      data-testid="rule-card"
      data-rule-name={rule.name}
      className={`rule-card ${rule.enabled ? 'rule-card-live' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline gap-2">
            <span className={`text-ui font-medium ${methodText}`}>{rule.method}</span>
            <span className="text-ui font-medium text-ink">{rule.statusCode}</span>
          </div>
          <h3 className={`truncate text-ui font-medium ${rule.enabled ? 'text-ink' : 'text-secondary'}`}>
            {rule.name}
          </h3>
          <p className="truncate font-mono text-meta text-secondary">{rule.urlPattern}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            data-testid="rule-power"
            className={`text-ui font-semibold ${rule.enabled ? 'text-signal' : 'text-ink'}`}
          >
            {rule.enabled ? 'On' : 'Off'}
          </span>
          <PowerSwitch
            live={rule.enabled}
            on={rule.enabled}
            label={rule.enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
            testId="rule-enabled-toggle"
            onClick={() => onToggle(rule.id, !rule.enabled)}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-testid="rule-edit"
            type="button"
            onClick={() => onEdit(rule)}
            className={secondaryButtonClass}
          >
            Edit
          </button>
          {!confirming ? (
            <button
              data-testid="rule-delete"
              type="button"
              onClick={handleDeleteClick}
              className={dangerButtonClass}
            >
              Delete
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-ui text-ink">Are you sure?</span>
              <button
                data-testid="rule-delete-confirm"
                type="button"
                onClick={handleConfirm}
                className={confirmButtonClass}
              >
                Confirm
              </button>
              <button
                data-testid="rule-delete-cancel"
                type="button"
                onClick={handleCancelDelete}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
            </span>
          )}
        </div>
        {rule.delayMs > 0 && (
          <span className="text-meta text-secondary">{rule.delayMs}ms delay</span>
        )}
      </div>
    </div>
  )
}
