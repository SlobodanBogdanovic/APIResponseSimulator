import { useState } from 'react'
import type { MockRule } from '../../shared/types'

interface RuleCardProps {
  rule: MockRule
  onEdit: (rule: MockRule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-green-100 text-green-700',
  POST:   'bg-blue-100 text-blue-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH:  'bg-purple-100 text-purple-700',
  ANY:    'bg-gray-100 text-gray-700',
}

export function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
  const [confirming, setConfirming] = useState(false)

  const handleDeleteClick = () => setConfirming(true)
  const handleConfirm = () => {
    setConfirming(false)
    onDelete(rule.id)
  }
  const handleCancelDelete = () => setConfirming(false)

  const methodColor = METHOD_COLORS[rule.method] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 transition-opacity ${rule.enabled ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${methodColor}`}>
              {rule.method}
            </span>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {rule.statusCode}
            </span>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{rule.name}</h3>
          </div>
          <p className="text-xs text-gray-500 font-mono truncate">{rule.urlPattern}</p>
        </div>

        {/* Right: toggle */}
        <button
          onClick={() => onToggle(rule.id, !rule.enabled)}
          className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            rule.enabled ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              rule.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdit(rule)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Edit
          </button>
          {!confirming ? (
            <button
              onClick={handleDeleteClick}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Delete
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Are you sure?</span>
              <button
                onClick={handleConfirm}
                className="text-xs text-red-600 hover:text-red-800 font-semibold transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={handleCancelDelete}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
        {rule.delayMs > 0 && (
          <span className="text-xs text-gray-400">{rule.delayMs}ms delay</span>
        )}
      </div>
    </div>
  )
}
