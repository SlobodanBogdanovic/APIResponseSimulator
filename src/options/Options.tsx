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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Response Simulator</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your HTTP mock rules</p>
          </div>
          {!showForm && (
            <div className="flex items-center gap-2">
              <ImportExportButtons rules={rules} onImport={handleImport} />
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="text-lg leading-none">+</span>
                Add rule
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8">
            <RuleForm
              initialRule={editingRule}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Rule list */}
        <RuleList
          rules={rules}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      </div>
    </div>
  )
}
