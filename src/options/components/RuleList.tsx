import type { MockRule } from '../../shared/types'
import { RuleCard } from './RuleCard'

interface RuleListProps {
  rules: MockRule[]
  onEdit: (rule: MockRule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

export function RuleList({ rules, onEdit, onDelete, onToggle }: RuleListProps) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">🔌</div>
        <p className="text-base font-medium text-gray-500">No rules yet. Add your first rule.</p>
        <p className="text-sm text-gray-400 mt-1">Click "Add rule" above to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
