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
      <div>
        <p className="text-ui text-ink">No rules yet. Add your first rule.</p>
        <p className="mt-2 text-meta text-secondary">Click "Add rule" above to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
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
