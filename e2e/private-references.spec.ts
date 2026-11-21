// Phase 1 for specs/005-remove-all-private-references.md.
// Criterion 1 and criterion 3 read the working tree. Criterion 2 drives the options page.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { createRule, expect, openExtensionPage, ruleCard, test } from './extension'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const EMPTY_HEADERS =
  'No custom headers. Content-Type: application/json is always added. Example: x-debug: true.'

const HEADER_COPY = {
  keyPlaceholder: 'x-debug',
  keyLabel: 'Header name',
  valuePlaceholder: 'true',
  valueLabel: 'Header value',
}

const QUICK_START_ROWS: Array<[string, string, string]> = [
  ['Name', '`List users`', 'A label for yourself'],
  [
    'URL pattern',
    '`localhost:3000/api/v1/users`',
    'See pattern syntax below. Host and port are an example.',
  ],
  ['Method', '`GET`', 'Or `ANY` to match all methods'],
  ['Status code', '`200`', 'Any HTTP status 100–599'],
  ['Response body', '`[{"id": 1, "name": "Ada"}]`', 'Any text or JSON string'],
  [
    'Response headers',
    '`x-debug: true`',
    '`Content-Type: application/json` is always included',
  ],
  ['Delay ms', '`0`', 'Add artificial latency if needed'],
]

const USERS_BODY = '[{"id": 1, "name": "Ada"}]'

const VALIDATION_ERROR = {
  error: 'Validation failed',
  field: 'name',
  message: 'Name is required',
}

const RETIRED_README = [
  'lockerconf',
  'Get timezone zone',
  'datetime/zone',
  'Europe/London',
  'Invalid timezone value',
]

const KNOWN_TEST_IDS = new Set([
  'global-toggle',
  'extension-disabled',
  'popup-rule',
  'popup-rule-toggle',
  'open-settings',
  'add-rule',
  'export-rules',
  'import-rules',
  'import-file',
  'import-export-status',
  'rule-card',
  'rule-enabled-toggle',
  'rule-edit',
  'rule-delete',
  'rule-delete-confirm',
  'rule-delete-cancel',
  'rule-name',
  'rule-url-pattern',
  'rule-method',
  'rule-status-code',
  'rule-response-body',
  'rule-delay',
  'add-header',
  'header-row',
  'header-key',
  'header-value',
  'remove-header',
  'save-rule',
  'cancel-rule',
])

const SKIP_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'playwright-report',
  'test-results',
  'blob-report',
])

const SKIP_FILES = new Set([
  'specs/005-remove-all-private-references.md',
  'e2e/private-references.spec.ts',
])

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'])

const BANNED_PATTERNS: Array<{ name: string; source: string }> = [
  { name: 'keba', source: '(?<![A-Za-z0-9])keba(?![A-Za-z0-9])' },
  { name: 'lockerconf', source: 'lockerconf' },
  { name: 'locker', source: '(?<![A-Za-z0-9])locker(?![A-Za-z0-9])' },
  { name: 'x-env', source: '(?<![A-Za-z0-9])x-env(?![A-Za-z0-9])' },
  { name: 'feature-env', source: '(?<![A-Za-z0-9])feature[\\s._-]?env(?![A-Za-z0-9])' },
  { name: 'env-header', source: '(?<![A-Za-z0-9])env[\\s._-]?header(?![A-Za-z0-9])' },
  { name: 'get timezone zone', source: 'get timezone zone' },
]

interface HeaderCopy {
  keyPlaceholder: string | null
  keyLabel: string | null
  valuePlaceholder: string | null
  valueLabel: string | null
}

interface BannedHit {
  file: string
  pattern: string
  excerpt: string
}

function readRepo(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function markdownTables(markdown: string): string[][][] {
  const tables: string[][][] = []
  let current: string[][] | null = null
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      current ??= []
      const cells = line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
      if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue
      current.push(cells)
    } else if (current) {
      tables.push(current)
      current = null
    }
  }
  if (current) tables.push(current)
  return tables
}

function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === heading)
  expect(start, heading).toBeGreaterThanOrEqual(0)
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      end = index
      break
    }
  }
  return lines.slice(start + 1, end).join('\n')
}

function fenceAfter(text: string, marker: string): string {
  const at = text.indexOf(marker)
  expect(at, marker).toBeGreaterThanOrEqual(0)
  const match = /```[^\n]*\n([\s\S]*?)```/.exec(text.slice(at))
  expect(match, `fenced block after ${marker}`).not.toBeNull()
  return (match?.[1] ?? '').replace(/\n$/, '')
}

function quickStartTable(markdown: string): string[][] {
  const table = markdownTables(markdown).find((rows) => {
    const header = rows[0] ?? []
    return header[0] === 'Field' && header[1] === 'Example' && header[2] === 'Notes'
  })
  expect(table, 'quick-start table with Field, Example, and Notes').toBeTruthy()
  return table ?? []
}

function exportSample(markdown: string): {
  version: number
  exportedAt: string
  rules: Array<Record<string, unknown>>
} {
  const blocks = [...markdown.matchAll(/```json\n([\s\S]*?)```/g)].map((match) => match[1] ?? '')
  const raw = blocks.find((block) => block.includes('"exportedAt"'))
  expect(raw, 'export sample JSON block').toBeTruthy()
  return JSON.parse(raw ?? '{}') as {
    version: number
    exportedAt: string
    rules: Array<Record<string, unknown>>
  }
}

function relativePath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function bannedHits(): BannedHit[] {
  const hits: BannedHit[] = []
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue
        if (entry.name === '.cache' && path.basename(directory) === 'playwright') continue
        visit(full)
        continue
      }
      if (!entry.isFile()) continue
      const rel = relativePath(full)
      if (SKIP_FILES.has(rel)) continue
      if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue
      const text = readFileSync(full, 'utf8')
      for (const pattern of BANNED_PATTERNS) {
        const expression = new RegExp(pattern.source, 'gi')
        for (const match of text.matchAll(expression)) {
          const index = match.index ?? 0
          const excerpt = text
            .slice(Math.max(0, index - 24), index + match[0].length + 24)
            .replace(/\s+/g, ' ')
          hits.push({ file: rel, pattern: pattern.name, excerpt })
        }
      }
    }
  }
  visit(repoRoot)
  return hits
}

async function headerCopy(row: Locator): Promise<HeaderCopy> {
  const key = row.getByTestId('header-key')
  const value = row.getByTestId('header-value')
  await expect(key).toBeVisible()
  await expect(value).toBeVisible()
  await expect(row.getByTestId('remove-header')).toBeVisible()
  return {
    keyPlaceholder: await key.getAttribute('placeholder'),
    keyLabel: await key.getAttribute('aria-label'),
    valuePlaceholder: await value.getAttribute('placeholder'),
    valueLabel: await value.getAttribute('aria-label'),
  }
}

async function expectNoPrivateHeaderWords(page: Page): Promise<void> {
  const text = (await page.locator('body').innerText()).toLowerCase()
  expect(text).not.toContain('env header')
  expect(text).not.toContain('x-env')
}

async function expectKnownTestIds(page: Page): Promise<void> {
  const ids = await page.locator('[data-testid]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-testid') ?? ''),
  )
  const unknown = [...new Set(ids)].filter((id) => !KNOWN_TEST_IDS.has(id))
  expect(unknown).toEqual([])
}

const savedRule = {
  name: 'Users',
  urlPattern: '127.0.0.1:4173/api/users',
  method: 'GET',
  statusCode: '200',
  responseBody: '[]',
}

test('1: README quick-start table uses the users example', () => {
  const table = quickStartTable(readRepo('README.md'))
  expect(table[0]).toEqual(['Field', 'Example', 'Notes'])
  expect(table.slice(1)).toEqual(QUICK_START_ROWS)
})

test('1: README export sample is the List users rule', () => {
  const sample = exportSample(readRepo('README.md'))
  expect(sample.version).toBe(1)
  expect(sample.exportedAt).toBe('2026-04-25T12:00:00.000Z')
  expect(sample.rules).toEqual([
    {
      id: '…',
      name: 'List users',
      enabled: true,
      method: 'GET',
      urlPattern: 'localhost:3000/api/v1/users',
      statusCode: 200,
      responseBody: USERS_BODY,
      responseHeaders: [{ key: 'x-debug', value: 'true' }],
      delayMs: 0,
      createdAt: 1714041600000,
    },
  ])
})

test('1: README response body tips use the users example and keep OK', () => {
  const tips = section(readRepo('README.md'), '## Response body tips')
  expect({
    json: fenceAfter(tips, '**JSON example:**'),
    error: JSON.parse(fenceAfter(tips, '**Error response example (status 422):**')) as unknown,
    plain: fenceAfter(tips, '**Plain text example (status 200):**'),
  }).toEqual({
    json: USERS_BODY,
    error: VALIDATION_ERROR,
    plain: 'OK',
  })
})

test('1: README omits the retired timezone example', () => {
  const readme = readRepo('README.md')
  const found = RETIRED_README.filter((token) => readme.includes(token))
  expect(found).toEqual([])
})

test('2: New rule empty response headers text includes the x-debug example', async ({
  context,
  extensionId,
}) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await options.getByTestId('add-rule').click()
  await expect(options.getByRole('heading', { name: 'New rule' })).toBeVisible()
  await expect(options.getByText('Response headers', { exact: true })).toBeVisible()
  await expectKnownTestIds(options)
  await expectNoPrivateHeaderWords(options)
  const empty = options.getByText(/No custom headers\./)
  await expect(empty).toBeVisible()
  expect(await empty.innerText()).toBe(EMPTY_HEADERS)
})

test('2: New rule header fields use x-debug and true with accessible names', async ({
  context,
  extensionId,
}) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await options.getByTestId('add-rule').click()
  await expect(options.getByRole('heading', { name: 'New rule' })).toBeVisible()
  await expect(options.getByTestId('add-header')).toBeVisible()
  await options.getByTestId('add-header').click()
  await expect(options.getByText(/No custom headers\./)).toHaveCount(0)
  await expect(options.getByTestId('header-row')).toHaveCount(1)
  expect(await headerCopy(options.getByTestId('header-row'))).toEqual(HEADER_COPY)
})

test('2: Edit rule with no headers shows the same empty response headers text', async ({
  context,
  extensionId,
}) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, savedRule)
  await ruleCard(options, 'Users').getByTestId('rule-edit').click()
  await expect(options.getByRole('heading', { name: 'Edit rule' })).toBeVisible()
  await expect(options.getByText('Response headers', { exact: true })).toBeVisible()
  const empty = options.getByText(/No custom headers\./)
  await expect(empty).toBeVisible()
  expect(await empty.innerText()).toBe(EMPTY_HEADERS)
})

test('2: Edit rule with no headers uses the same header placeholders and accessible names', async ({
  context,
  extensionId,
}) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, savedRule)
  await ruleCard(options, 'Users').getByTestId('rule-edit').click()
  await expect(options.getByRole('heading', { name: 'Edit rule' })).toBeVisible()
  await options.getByTestId('add-header').click()
  await expect(options.getByText(/No custom headers\./)).toHaveCount(0)
  await expect(options.getByTestId('header-row')).toHaveCount(1)
  expect(await headerCopy(options.getByTestId('header-row'))).toEqual(HEADER_COPY)
})

test('2: Edit rule with a saved header uses the same placeholders and hides the empty text', async ({
  context,
  extensionId,
}) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    ...savedRule,
    headers: [{ key: 'X-Mock-Test', value: 'yes' }],
  })
  await ruleCard(options, 'Users').getByTestId('rule-edit').click()
  await expect(options.getByRole('heading', { name: 'Edit rule' })).toBeVisible()
  await expect(options.getByText(/No custom headers\./)).toHaveCount(0)
  await options.getByTestId('add-header').click()
  const rows = options.getByTestId('header-row')
  await expect(rows).toHaveCount(2)
  expect([await headerCopy(rows.nth(0)), await headerCopy(rows.nth(1))]).toEqual([
    HEADER_COPY,
    HEADER_COPY,
  ])
})

test('3: banned private-reference patterns are absent from the working tree and dist', () => {
  expect(bannedHits()).toEqual([])
})
