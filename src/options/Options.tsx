import { useEffect, useState } from 'react'
import type { MockRule } from '../shared/types'
import {
  getRules,
  addRule,
  updateRule,
  deleteRule,
  toggleRule,
  importRules,
} from '../shared/storage'
import { RuleList } from './components/RuleList'
import { RuleForm } from './components/RuleForm'
import { ImportExportButtons } from './components/ImportExportButtons'
import { primaryButtonClass } from '../shared/ui'

export function Options() {
  const [rules, setRules] = useState<MockRule[]>([])
  const [editingRule, setEditingRule] = useState<MockRule | null>(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = async () => {
    const r = await getRules()
    setRules(r)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleAdd = () => {
    setEditingRule(null)
    setShowForm(true)
  }

  const handleEdit = (rule: MockRule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleSave = async (rule: MockRule) => {
    if (editingRule) {
      await updateRule(rule)
    } else {
      await addRule(rule)
    }
    setShowForm(false)
    setEditingRule(null)
    await refresh()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRule(null)
  }

  const handleDelete = async (id: string) => {
    await deleteRule(id)
    await refresh()
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)))
    await toggleRule(id, enabled)
    await refresh()
  }

  const handleImport = async (imported: MockRule[]) => {
    await importRules(imported)
    await refresh()
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div data-testid="options-column" className="mx-auto box-border w-[36rem] max-w-[36rem] border-0 p-0">
        <div className="surface-frame px-6 pb-8 pt-8">
          <header className="mb-6">
            <h1 className="text-left text-title font-semibold text-ink">API Response Simulator</h1>
            <p className="mt-2 text-meta text-secondary">Manage your HTTP mock rules</p>
            {!showForm && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  data-testid="add-rule"
                  type="button"
                  onClick={handleAdd}
                  className={primaryButtonClass}
                >
                  Add rule
                </button>
                <ImportExportButtons rules={rules} onImport={handleImport} />
              </div>
            )}
          </header>

          {showForm && (
            <div className="mb-6">
              <RuleForm
                initialRule={editingRule}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          )}

          <RuleList
            rules={rules}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        </div>
      </div>
    </div>
  )
}
