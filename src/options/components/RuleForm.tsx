import { useState } from 'react'
import type { MockRule } from '../../shared/types'
import { fieldClass, primaryButtonClass, secondaryButtonClass } from '../../shared/ui'

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
    <div className="surface-form">
      <h2 className="mb-4 text-ui font-semibold text-ink">
        {initialRule ? 'Edit rule' : 'New rule'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="rule-name" className="text-ui font-medium text-ink">Name</label>
          <input
            id="rule-name"
            data-testid="rule-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My mock rule"
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rule-url-pattern" className="text-ui font-medium text-ink">URL pattern</label>
          <input
            id="rule-url-pattern"
            data-testid="rule-url-pattern"
            type="text"
            required
            value={urlPattern}
            onChange={(e) => setUrlPattern(e.target.value)}
            placeholder="localhost:8080/api/*"
            className={`${fieldClass} font-mono`}
          />
          <p className="text-meta text-secondary">Use * as wildcard. Protocol is optional.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="rule-method" className="text-ui font-medium text-ink">Method</label>
            <select
              id="rule-method"
              data-testid="rule-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as MockRule['method'])}
              className={fieldClass}
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="rule-status-code" className="text-ui font-medium text-ink">Status code</label>
            <input
              id="rule-status-code"
              data-testid="rule-status-code"
              type="number"
              min={100}
              max={599}
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rule-response-body" className="text-ui font-medium text-ink">Response body</label>
          <textarea
            id="rule-response-body"
            data-testid="rule-response-body"
            rows={8}
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            placeholder={'{"message": "ok"}'}
            className={`${fieldClass} resize-y font-mono`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ui font-medium text-ink">Response headers</span>
            <button
              data-testid="add-header"
              type="button"
              onClick={addHeader}
              className={secondaryButtonClass}
            >
              + Add header
            </button>
          </div>
          {headers.length === 0 ? (
            <p className="text-meta text-secondary">No custom headers. Content-Type: application/json is always added. Example: x-debug: true.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {headers.map((row, idx) => (
                <div key={idx} data-testid="header-row" className="flex items-center gap-2">
                  <input
                    data-testid="header-key"
                    type="text"
                    value={row.key}
                    onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                    placeholder="x-debug"
                    aria-label="Header name"
                    className={`${fieldClass} font-mono`}
                  />
                  <input
                    data-testid="header-value"
                    type="text"
                    value={row.value}
                    onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                    placeholder="true"
                    aria-label="Header value"
                    className={`${fieldClass} font-mono`}
                  />
                  <button
                    data-testid="remove-header"
                    type="button"
                    onClick={() => removeHeader(idx)}
                    aria-label="Remove header"
                    className="shrink-0 px-2 text-ui text-danger"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rule-delay" className="text-ui font-medium text-ink">Delay (ms)</label>
          <input
            id="rule-delay"
            data-testid="rule-delay"
            type="number"
            min={0}
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            className={fieldClass}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            data-testid="cancel-rule"
            type="button"
            onClick={onCancel}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            data-testid="save-rule"
            type="submit"
            className={primaryButtonClass}
          >
            Save rule
          </button>
        </div>
      </form>
    </div>
  )
}
