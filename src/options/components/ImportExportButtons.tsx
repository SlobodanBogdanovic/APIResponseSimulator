import { useEffect, useRef, useState } from 'react'
import type { MockRule } from '../../shared/types'

interface ImportExportButtonsProps {
  rules: MockRule[]
  onImport: (rules: MockRule[]) => void | Promise<void>
}

interface Status {
  kind: 'success' | 'error'
  message: string
}

const ALLOWED_METHODS = new Set<MockRule['method']>([
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'ANY',
])

const STATUS_AUTO_CLEAR_MS = 3000

interface ParseResult {
  rules: MockRule[]
  skipped: number
}

function parseImport(json: unknown): ParseResult {
  let rawRules: unknown
  if (Array.isArray(json)) {
    rawRules = json
  } else if (json && typeof json === 'object' && Array.isArray((json as { rules?: unknown }).rules)) {
    rawRules = (json as { rules: unknown[] }).rules
  } else {
    throw new Error('Invalid file: expected an object with a "rules" array, or an array of rules.')
  }

  const arr = rawRules as unknown[]
  const valid: MockRule[] = []
  let skipped = 0

  for (const entry of arr) {
    if (!entry || typeof entry !== 'object') {
      skipped++
      continue
    }
    const e = entry as Record<string, unknown>
    const name = typeof e['name'] === 'string' ? (e['name'] as string).trim() : ''
    const urlPattern = typeof e['urlPattern'] === 'string' ? (e['urlPattern'] as string).trim() : ''
    const method = e['method']
    const statusCode = e['statusCode']

    if (
      !name ||
      !urlPattern ||
      typeof method !== 'string' ||
      !ALLOWED_METHODS.has(method as MockRule['method']) ||
      typeof statusCode !== 'number' ||
      !Number.isFinite(statusCode)
    ) {
      skipped++
      continue
    }

    const rawHeaders = Array.isArray(e['responseHeaders']) ? (e['responseHeaders'] as unknown[]) : []
    const responseHeaders = rawHeaders
      .filter(
        (h): h is { key: string; value: string } =>
          !!h &&
          typeof h === 'object' &&
          typeof (h as { key?: unknown }).key === 'string' &&
          typeof (h as { value?: unknown }).value === 'string'
      )
      .map((h) => ({ key: h.key, value: h.value }))

    valid.push({
      id: typeof e['id'] === 'string' ? (e['id'] as string) : '',
      name,
      enabled: typeof e['enabled'] === 'boolean' ? (e['enabled'] as boolean) : true,
      method: method as MockRule['method'],
      urlPattern,
      statusCode,
      responseBody: typeof e['responseBody'] === 'string' ? (e['responseBody'] as string) : '',
      responseHeaders,
      delayMs:
        typeof e['delayMs'] === 'number' && Number.isFinite(e['delayMs'])
          ? (e['delayMs'] as number)
          : 0,
      createdAt:
        typeof e['createdAt'] === 'number' && Number.isFinite(e['createdAt'])
          ? (e['createdAt'] as number)
          : Date.now(),
    })
  }

  return { rules: valid, skipped }
}

function todayStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ImportExportButtons({ rules, onImport }: ImportExportButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    if (!status) return
    const t = window.setTimeout(() => setStatus(null), STATUS_AUTO_CLEAR_MS)
    return () => window.clearTimeout(t)
  }, [status])

  const handleExport = () => {
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        rules,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ninja-interceptor-rules-${todayStamp()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus({
        kind: 'success',
        message: `Exported ${rules.length} rule${rules.length === 1 ? '' : 's'}.`,
      })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to export rules.',
      })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('File is not valid JSON.')
      }
      const { rules: imported, skipped } = parseImport(parsed)
      if (imported.length === 0) {
        throw new Error('No valid rules found in file.')
      }
      await onImport(imported)
      const skippedSuffix = skipped > 0 ? ` (skipped ${skipped} invalid)` : ''
      setStatus({
        kind: 'success',
        message: `Imported ${imported.length} rule${imported.length === 1 ? '' : 's'}${skippedSuffix}.`,
      })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to import rules.',
      })
    }
  }

  const canExport = rules.length > 0

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span
          className={`text-xs font-medium ${
            status.kind === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
          role="status"
        >
          {status.message}
        </span>
      )}
      <button
        onClick={handleExport}
        disabled={!canExport}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title={canExport ? 'Download rules as JSON' : 'No rules to export'}
      >
        Export
      </button>
      <button
        onClick={handleImportClick}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        title="Import rules from a JSON file"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
