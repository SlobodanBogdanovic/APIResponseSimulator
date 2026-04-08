import { useState } from 'react'
import type { MockRule } from '../../shared/types'

interface HeaderRow {
  key: string
  value: string
}

interface RuleFormProps {
  initialRule: MockRule | null
  onSave: (rule: MockRule) => void
  onCancel: () => void
}

const METHOD_OPTIONS = ['ANY', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const

export function RuleForm({ initialRule, onSave, onCancel }: RuleFormProps) {
  const [name, setName] = useState(initialRule?.name ?? '')
  const [urlPattern, setUrlPattern] = useState(initialRule?.urlPattern ?? '')
  const [method, setMethod] = useState<MockRule['method']>(initialRule?.method ?? 'ANY')
  const [statusCode, setStatusCode] = useState(initialRule?.statusCode ?? 200)
  const [responseBody, setResponseBody] = useState(initialRule?.responseBody ?? '')
  const [headers, setHeaders] = useState<HeaderRow[]>(
    initialRule?.responseHeaders?.length
      ? initialRule.responseHeaders
      : []
  )
  const [delayMs, setDelayMs] = useState(initialRule?.delayMs ?? 0)

  const addHeader = () => setHeaders((h) => [...h, { key: '', value: '' }])

  const removeHeader = (idx: number) =>
    setHeaders((h) => h.filter((_, i) => i !== idx))

  const updateHeader = (idx: number, field: 'key' | 'value', val: string) =>
    setHeaders((h) => h.map((row, i) => (i === idx ? { ...row, [field]: val } : row)))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const rule: MockRule = {
      id: initialRule?.id ?? crypto.randomUUID(),
      createdAt: initialRule?.createdAt ?? Date.now(),
      name: name.trim(),
      enabled: initialRule?.enabled ?? true,
      method,
      urlPattern: urlPattern.trim(),
      statusCode,
      responseBody,
      responseHeaders: headers.filter((h) => h.key.trim()),
      delayMs,
    }
    onSave(rule)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {initialRule ? 'Edit rule' : 'New rule'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My mock rule"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* URL Pattern */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL pattern</label>
          <input
            type="text"
            required
            value={urlPattern}
            onChange={(e) => setUrlPattern(e.target.value)}
            placeholder="localhost:8080/api/*"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">Use * as wildcard. Protocol is optional.</p>
        </div>

        {/* Method + Status Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as MockRule['method'])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status code</label>
            <input
              type="number"
              min={100}
              max={599}
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Response Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Response body</label>
          <textarea
            rows={8}
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            placeholder={'{"message": "ok"}'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Response Headers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Response headers</label>
            <button
              type="button"
              onClick={addHeader}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              + Add header
            </button>
          </div>
          {headers.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No custom headers. Content-Type: application/json is always added.</p>
          ) : (
            <div className="space-y-2">
              {headers.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                    placeholder="Header name"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove header"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delay (ms)</label>
          <input
            type="number"
            min={0}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save rule
          </button>
        </div>
      </form>
    </div>
  )
}
