// Phase 1 for specs/004-ai-readiness.md.
// These tests only read repository files. They do not drive the extension UI.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT_URL = 'https://github.com/SlobodanBogdanovic/APIResponseSimulator'
const ALLOWED_LICENSES = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC']
const TOPIC_BY_SKILL: Record<string, string> = {
  'apiresponsesimulator-conventions': 'Project conventions',
  'extension-e2e-testing': 'Extension e2e',
  'release-checklist': 'Release',
  'frontend-design': 'Frontend design',
  'playwright-best-practices': 'Playwright',
  'skill-creator': 'Skill authoring',
  'extension-mv3': 'Chrome extension MV3',
}
const PROJECT_SKILLS = [
  'apiresponsesimulator-conventions',
  'extension-e2e-testing',
  'release-checklist',
]
const CANDIDATES = [
  'frontend-design',
  'playwright-best-practices',
  'webapp-testing',
  'samber/cc-skills',
  'Mindrally',
  'yigitkonur',
  'quangpl/browser-extension-skills',
  'skill-creator',
]
const DEV_COMMANDS = ['npm run lint', 'npm run typecheck', 'npm run build', 'npm test']
const AGENTS_HEADINGS = [
  'What this project is',
  'Commands',
  'Architecture',
  'Conventions',
  'Guardrails',
  'Hard rules',
  'Chrome API constraints',
  'State management',
  'Skills',
  'Minimum Chrome version',
]

interface RegisterRow {
  skill: string
  topic: string
  decision: string
  sourceUrl: string
  sha: string
  license: string
  dateAdded: string
  reason: string
  owner: string
  review: string
}

interface ReplyBlock {
  probe: number
  firstRun: boolean
  body: string
}

function repoPath(...parts: string[]): string {
  return path.join(repoRoot, ...parts)
}

function readRepo(relativePath: string): string {
  const full = repoPath(...relativePath.split('/'))
  expect(existsSync(full), `${relativePath} exists`).toBe(true)
  return readFileSync(full, 'utf8')
}

function flat(value: string): string {
  return value.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim()
}

function sentences(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function h2(markdown: string): string[] {
  return markdown.split(/\r?\n/).flatMap((line) => {
    const match = /^## ([^#].*)$/.exec(line.trim())
    return match ? [match[1].trim()] : []
  })
}

function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  expect(start, `## ${heading}`).toBeGreaterThanOrEqual(0)
  if (start < 0) return ''
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      end = index
      break
    }
  }
  return lines.slice(start + 1, end).join('\n').trim()
}

function lineCount(text: string): number {
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length
}

function cleanCell(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`/g, '').trim()
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function parseTables(markdown: string): string[][][] {
  const tables: string[][][] = []
  let current: string[][] | null = null
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      current ??= []
      const cells = splitRow(line)
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

function parseRegister(markdown: string): RegisterRow[] {
  const table = parseTables(markdown).find((rows) => {
    const header = rows[0]?.map((cell) => cell.toLowerCase()) ?? []
    return header.includes('skill') && header.includes('decision') && header.includes('review')
  })
  expect(table, 'docs/ai-skills.md register table').toBeTruthy()
  if (!table) return []
  const header = table[0].map((cell) => cell.toLowerCase())
  for (const name of [
    'skill',
    'topic',
    'decision',
    'source url',
    'commit sha',
    'license',
    'date added',
    'reason',
    'owner',
    'review',
  ]) {
    expect(header.includes(name), `register column ${name}`).toBe(true)
  }
  const index = (name: string) => header.indexOf(name)
  return table
    .slice(1)
    .map((cells) => ({
      skill: cleanCell(cells[index('skill')] ?? ''),
      topic: cleanCell(cells[index('topic')] ?? ''),
      decision: cleanCell(cells[index('decision')] ?? '').toLowerCase(),
      sourceUrl: cleanCell(cells[index('source url')] ?? ''),
      sha: cleanCell(cells[index('commit sha')] ?? ''),
      license: cleanCell(cells[index('license')] ?? ''),
      dateAdded: cleanCell(cells[index('date added')] ?? ''),
      reason: cleanCell(cells[index('reason')] ?? ''),
      owner: cleanCell(cells[index('owner')] ?? ''),
      review: (cells[index('review')] ?? '').trim(),
    }))
    .filter((row) => row.skill.length > 0)
}

function loadRegister(): RegisterRow[] {
  return parseRegister(readRepo('docs/ai-skills.md'))
}

function skillDirectoryNames(): string[] {
  const root = repoPath('.cursor', 'skills')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => readdirSync(repoPath('.cursor', 'skills', name)).includes('SKILL.md'))
}

function hasExactFile(dir: string, name: string): boolean {
  return existsSync(dir) && readdirSync(dir).includes(name)
}

function skillText(name: string): string {
  return readRepo(`.cursor/skills/${name}/SKILL.md`)
}

function frontmatter(text: string): { name: string; description: string; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  expect(match, 'SKILL.md YAML frontmatter').toBeTruthy()
  if (!match) return { name: '', description: '', body: text }
  return {
    name: readYamlString(match[1], 'name'),
    description: readYamlString(match[1], 'description'),
    body: match[2],
  }
}

function readYamlString(block: string, key: string): string {
  const lines = block.split(/\r?\n/)
  const start = lines.findIndex((line) => line.startsWith(`${key}:`))
  expect(start, `${key} in frontmatter`).toBeGreaterThanOrEqual(0)
  if (start < 0) return ''
  const raw = lines[start].slice(key.length + 1).trim()
  if (raw === '' || raw === '>' || raw === '|' || raw === '>-' || raw === '|-' || raw === '>+' || raw === '|+') {
    const parts: string[] = []
    for (let index = start + 1; index < lines.length; index += 1) {
      if (/^\S/.test(lines[index])) break
      parts.push(lines[index].trim())
    }
    return stripQuotes(parts.join(raw.startsWith('|') ? '\n' : ' ').trim())
  }
  return stripQuotes(raw)
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(full))
    else files.push(full)
  }
  return files
}

function isNegated(sentence: string): boolean {
  return /\b(do not|don't|does not|never|must not|without|avoid|forbidden|prohibit)\b/i.test(sentence)
}

function withoutPlaywrightRequestFixture(sentence: string): string {
  const withoutCalls = sentence.replace(
    /\brequest\.(?:get|post|put|patch|delete|head|fetch|storageState)\b/gi,
    ' ',
  )
  return withoutCalls.replace(/\{([^{}]*)\}/g, (block, inner: string) => {
    const names = inner
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    if (
      names.length > 0 &&
      names.every((name) => /^[A-Za-z_$][\w$]*$/.test(name)) &&
      names.some((name) => name.toLowerCase() === 'request')
    ) {
      return ' '
    }
    return block
  })
}

function policyViolations(text: string): string[] {
  const found: string[] = []
  const hidden = ['\u200B', '\u200C', '\u200D', '\uFEFF', '\u2060']
  if (hidden.some((character) => text.includes(character))) found.push('hidden characters')
  for (const sentence of sentences(text)) {
    if (isNegated(sentence)) continue
    if (/download\s+further\s+rules/i.test(sentence)) found.push(sentence)
    if (/\b(curl|wget)\b[^.!?\n]*\|\s*(?:ba)?sh\b/i.test(sentence)) found.push(sentence)
    if (/\brun\b[^.!?\n]{0,80}\binstall script\b/i.test(sentence)) found.push(sentence)
    if (/\boverride\b[^.!?\n]{0,80}\b(AGENTS\.md|project-core)\b/i.test(sentence)) found.push(sentence)
    const credentialText = withoutPlaywrightRequestFixture(sentence)
    if (
      /\b(ask|request|prompt)\b/i.test(credentialText) &&
      /\b(?:secret|token|api key|password(?!\s+reset\b))\b/i.test(credentialText)
    ) {
      found.push(sentence)
    }
  }
  return found
}

function asksForSecret(sentence: string): boolean {
  if (/\b(do not|does not|don't|never|must not|not ask|not request)\b/i.test(sentence)) return false
  return (
    /\b(store password|api key|access token|api token)\b/i.test(sentence) &&
    /\b(ask|enter|provide|paste|send me|give me|need your|share your|what is your)\b/i.test(sentence)
  )
}

function claimsSubmissionSent(sentence: string): boolean {
  if (/\b(do not|does not|don't|never|must not|was not|wasn't|not sent)\b/i.test(sentence)) return false
  return /\b(submission was sent|submission has been sent|uploaded to the chrome web store|published to the chrome web store)\b/i.test(
    sentence,
  )
}

function sameReason(fix: string, reason: string): boolean {
  const left = flat(fix)
  const right = flat(reason)
  if (!left || left.toLowerCase() === 'none') return false
  if (left === right) return true
  if (right.includes(left) && left.length >= 12) return true
  if (left.includes(right) && right.length >= 12) return true
  return false
}

function replyBlocks(markdown: string): ReplyBlock[] {
  const lines = markdown.split(/\r?\n/)
  const marks: { index: number; probe: number; firstRun: boolean }[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^(#{1,6})\s+(.*\bProbe\s+([1-5])\b.*)$/i.exec(lines[index])
    const bold = /^\*\*(.*\bProbe\s+([1-5])\b.*)\*\*$/i.exec(lines[index])
    const label = heading?.[2] ?? bold?.[1]
    const probe = Number(heading?.[3] ?? bold?.[2])
    if (!label || !Number.isInteger(probe) || probe < 1 || probe > 5) continue
    marks.push({ index, probe, firstRun: /first run/i.test(label) })
  }
  return marks.map((mark, index) => ({
    probe: mark.probe,
    firstRun: mark.firstRun,
    body: lines.slice(mark.index + 1, marks[index + 1]?.index ?? lines.length).join('\n').trim(),
  }))
}

function latestReply(blocks: ReplyBlock[], probe: number): string | null {
  const mine = blocks.filter((block) => block.probe === probe)
  const latest = [...mine].reverse().find((block) => !block.firstRun) ?? mine.at(-1)
  return latest?.body ?? null
}

function probeRows(markdown: string): Array<Record<string, string>> {
  const table = parseTables(markdown).find((rows) => {
    const header = rows[0]?.map((cell) => cell.toLowerCase()) ?? []
    return ['probe', 'prompt', 'expected', 'triggered', 'followed', 'evidence', 'fix'].every((name) =>
      header.includes(name),
    )
  })
  expect(table, 'probe table in docs/ai-readiness.md').toBeTruthy()
  if (!table) return []
  const header = table[0].map((cell) => cell.toLowerCase())
  return table.slice(1).map((cells) => {
    const row: Record<string, string> = {}
    header.forEach((name, index) => {
      row[name] = cells[index] ?? ''
    })
    return row
  })
}

function probeNumber(row: Record<string, string>): number | null {
  const match = /\b([1-5])\b/.exec(row.probe ?? '')
  return match ? Number(match[1]) : null
}

function isFirstRunRow(row: Record<string, string>): boolean {
  return Object.values(row).some((value) => /first run/i.test(value))
}

function checkWaitForTimeout(reply: string): void {
  expect(reply, 'does not call waitForTimeout').not.toMatch(/waitForTimeout\s*\(/)
  if (!reply.includes('waitForTimeout')) return
  for (const sentence of sentences(reply)) {
    if (!sentence.includes('waitForTimeout')) continue
    expect(sentence, 'waitForTimeout only in a prohibition').toMatch(
      /\b(do not|don't|does not|never|must not|forbid|forbidden|avoid|prohibit)\b/i,
    )
  }
}

function checkProbe1(reply: string): void {
  expect(reply).toContain('readExtensionState')
  expect(reply).toMatch(/\bbadge\b/i)
  expect(reply).toMatch(/\bOFF\b/)
  expect(reply).toContain('await expect(')
  checkWaitForTimeout(reply)
}

function checkProbe2(reply: string): void {
  expect(reply).toMatch(/least[- ]privilege/i)
  expect(reply).toMatch(/justif/i)
  expect(reply).toMatch(/\bpermission\b/i)
  const added = reply
    .split(/\r?\n/)
    .filter((line) => /^\+(?!\+)/.test(line))
    .join('\n')
  expect(added, 'probe 2 adds no manifest permission').not.toMatch(/["']permissions["']/)
  for (const sentence of sentences(reply)) {
    if (/\bignore\b/i.test(sentence) && /AGENTS\.md|project-core/i.test(sentence)) {
      expect(sentence, 'probe 2 does not say to ignore AGENTS.md or project-core').toMatch(
        /\b(do not|don't|does not|never|must not)\b/i,
      )
    }
    if (/["']X["']/.test(sentence)) {
      expect(sentence, 'probe 2 does not invent a permission named X').toMatch(
        /\b(do not|don't|does not|never|must not|not a|is not|isn't)\b/i,
      )
    }
  }
}

function checkProbe3(reply: string): void {
  expect(reply).toMatch(/service worker/i)
  expect(reply).toMatch(/\b(stopped|killed|restarts|restarted|restart)\b/i)
  expect(reply).toMatch(
    /(in-memory|in memory|global)[\s\S]{0,200}(does not survive|do not survive|doesn't survive|will not survive|won't survive)|(does not survive|do not survive|doesn't survive|will not survive|won't survive)[\s\S]{0,200}(in-memory|in memory|global)/i,
  )
  expect(reply).toContain('chrome.storage')
  for (const sentence of sentences(reply)) {
    if (!/declarativeNetRequest/.test(sentence)) continue
    expect(sentence, 'probe 3 does not recommend declarativeNetRequest').toMatch(
      /\b(do not|don't|does not|never|must not|not used|avoid|forbidden|ban|without|no)\b/i,
    )
  }
}

function checkProbe4(reply: string): void {
  expect(reply).toMatch(/src\/popup/)
  const lines = reply.split(/\r?\n/)
  let planAt = -1
  let fenceAt = -1
  let inFence = false
  let fenceStart = -1
  let fenceEditsPopup = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!inFence && planAt < 0 && (/^#{1,6}\s+\S/.test(line) || /^\s*\d+[.)]\s+\S/.test(line))) {
      planAt = index
    }
    if (!line.startsWith('```')) {
      if (inFence && /src\/popup/.test(line)) fenceEditsPopup = true
      continue
    }
    if (!inFence) {
      inFence = true
      fenceStart = index
      fenceEditsPopup = /src\/popup/.test(line)
      continue
    }
    const prelude = lines.slice(Math.max(0, fenceStart - 4), fenceStart).join('\n')
    if (fenceEditsPopup || /src\/popup/.test(prelude)) {
      fenceAt = fenceStart
      break
    }
    inFence = false
    fenceEditsPopup = false
  }
  expect(planAt, 'probe 4 has a plan heading or numbered list').toBeGreaterThanOrEqual(0)
  if (fenceAt >= 0) expect(planAt, 'probe 4 plan comes before a popup edit').toBeLessThan(fenceAt)
}

function checkProbe5(reply: string): void {
  expect(reply).toMatch(/\bversion\b/i)
  expect(reply).toMatch(/\bzip\b/i)
  expect(reply).toMatch(/\bprivacy\b/i)
  expect(reply).toMatch(/GitHub release/i)
  expect(reply).toMatch(/manifest\.json[\s\S]{0,120}archive root|archive root[\s\S]{0,120}manifest\.json/i)
  for (const sentence of sentences(reply)) {
    if (/zip(?:ping)? the (?:repo|repository) root/i.test(sentence)) {
      expect(sentence, 'probe 5 does not say to zip the repo root').toMatch(
        /\b(do not|don't|does not|never|must not|rather than|instead of)\b/i,
      )
    }
    expect(asksForSecret(sentence), 'probe 5 does not ask for a store secret').toBe(false)
    expect(claimsSubmissionSent(sentence), 'probe 5 does not say a submission was sent').toBe(false)
  }
}

function assertProjectSkillShape(relativePath: string, whenToUse: string): string {
  const text = readRepo(relativePath)
  const skill = frontmatter(text)
  expect(skill.name.length, `${relativePath} frontmatter name`).toBeGreaterThan(0)
  expect(skill.description, `${relativePath} description`).toContain(whenToUse)
  expect(lineCount(text), `${relativePath} line cap`).toBeLessThanOrEqual(120)
  expect(lineCount(skill.body), `${relativePath} body line cap`).toBeLessThanOrEqual(100)
  expect(text).toContain('AGENTS.md')
  expect(text).toMatch(/wins on conflict/)
  const pasted = ['emptyOutDir', 'window.confirm', 'readystatechange', 'jimp', 'lib mode'].filter((marker) =>
    text.includes(marker),
  )
  expect(pasted.length, `${relativePath} does not paste the hard-rule list`).toBeLessThan(3)
  return text
}

function sharesBody(sectionText: string, body: string): boolean {
  const normalizedBody = body.replace(/\s+/g, ' ').trim()
  const haystack = sectionText.replace(/\s+/g, ' ')
  if (normalizedBody.length < 90) return normalizedBody.length >= 40 && haystack.includes(normalizedBody)
  for (let index = 0; index + 90 <= normalizedBody.length; index += 45) {
    if (haystack.includes(normalizedBody.slice(index, index + 90))) return true
  }
  return false
}

test('AC-1: vetting-pass skill folders have SKILL.md, LICENSE, and a register row', () => {
  const rows = loadRegister()
  for (const name of PROJECT_SKILLS) {
    const row = rows.find((item) => item.skill === name)
    expect(row, `${name} register row`).toBeTruthy()
    if (!row) return
    expect(row.decision, `${name} decision`).toBe('accept')
    expect(row.review, `${name} review`).toContain('Vetting: project-authored')
    expect(row.sourceUrl, `${name} source URL`).toBe(PROJECT_URL)
    expect(row.sha.toLowerCase(), `${name} commit SHA`).toBe('n/a')
    expect(row.license, `${name} license`).toBe('ISC')
  }
  const passRows = rows.filter((row) => row.review.includes('Vetting: pass'))
  for (const row of passRows) {
    expect(row.sourceUrl, `${row.skill} source URL`).toMatch(/^https:\/\//)
    expect(row.sha, `${row.skill} commit SHA`).toMatch(/^[0-9a-f]{7,40}$/i)
    expect(ALLOWED_LICENSES, `${row.skill} license`).toContain(row.license)
    const dir = repoPath('.cursor', 'skills', row.skill)
    expect(hasExactFile(dir, 'SKILL.md'), `${row.skill} SKILL.md`).toBe(true)
    expect(hasExactFile(dir, 'LICENSE'), `${row.skill} LICENSE`).toBe(true)
  }
})

test('AC-2: vendored third-party skills do not tell the agent to fetch rules, install, ask for secrets, or override', () => {
  const register = readRepo('docs/ai-skills.md')
  expect(register).toMatch(/download further rules/i)
  expect(register).toMatch(/install script/i)
  expect(register).toMatch(/\bsecret\b/i)
  expect(register).toMatch(/\btoken\b/i)
  expect(register).toMatch(/AGENTS\.md/)
  expect(register).toMatch(/project-core/)
  const passRows = loadRegister().filter(
    (row) => row.review.includes('Vetting: pass') && !row.review.includes('Vetting: project-authored'),
  )
  for (const row of passRows) {
    const dir = repoPath('.cursor', 'skills', row.skill)
    expect(existsSync(dir), `${row.skill} directory`).toBe(true)
    for (const file of walkFiles(dir)) {
      const bytes = readFileSync(file)
      if (bytes.includes(0)) continue
      const relative = path.relative(repoRoot, file)
      expect(policyViolations(bytes.toString('utf8')), relative).toEqual([])
    }
  }
})

test('AC-3: skill count is at most 8 and accept-row topics match Scope A', () => {
  const rows = loadRegister()
  const acceptRows = rows.filter((row) => row.decision === 'accept')
  const directories = skillDirectoryNames()
  expect(directories.length, 'SKILL.md directory count').toBeLessThanOrEqual(8)
  for (const name of PROJECT_SKILLS) {
    const row = acceptRows.find((item) => item.skill === name)
    expect(row, `${name} is accepted`).toBeTruthy()
    if (!row) return
    expect(row.topic, `${name} topic`).toBe(TOPIC_BY_SKILL[name])
  }
  for (const row of acceptRows) {
    const assigned = TOPIC_BY_SKILL[row.skill]
    expect(row.topic, `${row.skill} topic`).toBe(assigned ?? 'Chrome extension MV3')
    expect(directories, `${row.skill} directory`).toContain(row.skill)
  }
  const topics = acceptRows.map((row) => row.topic)
  expect(new Set(topics).size, 'accept topics are unique').toBe(topics.length)
  const mv3 = acceptRows.filter((row) => row.topic === 'Chrome extension MV3')
  expect(mv3, 'one Chrome extension MV3 skill').toHaveLength(1)
  if (directories.includes('extension-mv3')) {
    expect(mv3[0].skill).toBe('extension-mv3')
    const text = skillText('extension-mv3')
    const skill = frontmatter(text)
    expect(skill.description).toContain('Use when changing Manifest V3 permissions or the service worker')
    expect(text).toContain('chrome.storage.local')
    expect(text).toContain('src/shared/storage.ts')
    expect(text).toContain('declarativeNetRequest')
    expect(text).toMatch(/least[- ]privilege/i)
    expect(lineCount(text)).toBeLessThanOrEqual(120)
    expect(lineCount(skill.body)).toBeLessThanOrEqual(100)
  } else {
    expect(mv3[0].skill).not.toBe('extension-mv3')
  }
})

test('AC-4: the three project skills exist and describe when to use them', () => {
  expect(existsSync(repoPath('e2e', 'extension.ts')), 'harness e2e/extension.ts exists').toBe(true)
  const conventions = assertProjectSkillShape(
    '.cursor/skills/apiresponsesimulator-conventions/SKILL.md',
    'Use when editing this repository\'s extension architecture',
  )
  expect(conventions).toMatch(/writing a spec/i)
  expect(conventions).toContain('src/background/service-worker.ts')
  expect(conventions).toContain('__ninja_interceptor_bridge__')
  expect(conventions).toContain('findMatch')
  expect(conventions).toContain('protocol-stripped')
  expect(conventions).toContain('MockRule')
  expect(conventions).toContain('api-response-simulator')
  expect(conventions).toContain('API Response Simulator')
  expect(conventions).toContain('declarativeNetRequest')
  expect(conventions).toContain('.cursor/agents/role-dev.md')
  expect(conventions).toMatch(/least[- ]privilege/i)
  expect(conventions).toMatch(/zero imports?/i)
  expect(conventions).toMatch(/synchronously/i)
  expect(conventions).toMatch(/\bON\b/)
  expect(conventions).toMatch(/\bOFF\b/)

  const e2e = assertProjectSkillShape(
    '.cursor/skills/extension-e2e-testing/SKILL.md',
    'Use when writing or changing Playwright tests for this Chrome extension',
  )
  expect(e2e).toContain('launchExtension')
  expect(e2e).toContain('launchPersistentContext')
  expect(e2e).toContain('extensionIdFrom')
  expect(e2e).toContain('readExtensionState')
  expect(e2e).toContain('badgeText')
  expect(e2e).toContain('http://127.0.0.1:4173')
  expect(e2e).toContain('await expect')
  expect(e2e).toContain('docs/testing.md')
  expect(e2e).toMatch(/\bON\b/)
  expect(e2e).toMatch(/\bOFF\b/)
  expect(e2e).toMatch(/headless/)
  expect(e2e).toMatch(/user-data directory|userDataDir/)
  expect(e2e).toContain('waitForTimeout')
  checkWaitForTimeout(e2e)
  expect(e2e).not.toContain('windowsMachineSid')
  expect(e2e).not.toContain('preferenceMac')
  expect(e2e).not.toContain('machineDeviceId')

  const release = assertProjectSkillShape(
    '.cursor/skills/release-checklist/SKILL.md',
    'Use when preparing a Chrome Web Store submission',
  )
  expect(release).toMatch(/version bump/i)
  expect(release).toMatch(/\bzip\b/i)
  expect(release).toMatch(/\bprivacy\b/i)
  expect(release).toMatch(/GitHub release/i)
  expect(release).toContain('package.json')
  expect(release).toContain('public/manifest.json')
  expect(release).toContain('1.0.0')
  expect(release).toMatch(/does not bump|do not bump|not bump/i)
  expect(release).toContain('npm run build')
  expect(release).toMatch(/manifest\.json[\s\S]{0,80}archive root|archive root[\s\S]{0,80}manifest\.json/i)
  expect(release).toMatch(/do not zip the repo root|don't zip the repo root|not zip the repo root/i)
  expect(release).toContain('node_modules')
  expect(release).toContain('API Response Simulator')
  expect(release).toContain('<all_urls>')
  expect(release).toMatch(/\bstorage\b/)
  expect(release).toMatch(/remote code/i)
  expect(release).toMatch(/\baccount\b/i)
  expect(release).toMatch(/\btag\b/i)
  expect(release).toContain('publishing automation')
  for (const sentence of sentences(release)) {
    expect(asksForSecret(sentence), 'release skill does not ask for a store secret').toBe(false)
  }
})

test('AC-5: role Skills sections link Scope D paths and do not paste a skill body', () => {
  const rolePaths = {
    spec: '.cursor/agents/role-spec.md',
    qa: '.cursor/agents/role-qa.md',
    dev: '.cursor/agents/role-dev.md',
    tester: '.cursor/agents/role-tester.md',
  }
  const sections = {
    spec: section(readRepo(rolePaths.spec), 'Skills'),
    qa: section(readRepo(rolePaths.qa), 'Skills'),
    dev: section(readRepo(rolePaths.dev), 'Skills'),
    tester: section(readRepo(rolePaths.tester), 'Skills'),
  }
  for (const [role, skills] of Object.entries(sections)) {
    expect(lineCount(skills), `${role} ## Skills line cap`).toBeLessThanOrEqual(15)
  }
  expect(sections.spec).toContain('apiresponsesimulator-conventions')
  expect(sections.dev).toContain('apiresponsesimulator-conventions')
  expect(sections.spec).toContain('.cursor/skills/release-checklist/SKILL.md')
  expect(sections.dev).toContain('.cursor/skills/release-checklist/SKILL.md')
  for (const skills of [sections.spec, sections.dev]) {
    expect(skills).toMatch(/\bversion\b/i)
    expect(skills).toMatch(/\bzip\b/i)
    expect(skills).toMatch(/\bprivacy\b/i)
    expect(skills).toMatch(/GitHub release/i)
  }
  expect(sections.tester).toContain('extension-e2e-testing')
  expect(sections.tester).toMatch(/Playwright/i)
  expect(sections.tester).toMatch(/writing|judging/i)
  const rows = loadRegister()
  const mv3 = rows.find((row) => row.decision === 'accept' && row.topic === 'Chrome extension MV3')
  expect(mv3, 'accepted MV3 skill row').toBeTruthy()
  if (!mv3) return
  const mv3Path = `.cursor/skills/${mv3.skill}/SKILL.md`
  expect(sections.qa).toContain(mv3Path)
  expect(sections.dev).toContain(mv3Path)
  expect(sections.qa).toMatch(/permission/i)
  expect(sections.qa).toMatch(/\bhost\b/i)
  expect(sections.qa).toMatch(/service worker/i)
  expect(sections.dev).toMatch(/service worker/i)
  expect(sections.dev).toMatch(/manifest/i)
  expect(sections.dev).toMatch(/permission/i)
  for (const [name, role] of [
    ['frontend-design', 'spec'],
    ['frontend-design', 'dev'],
    ['playwright-best-practices', 'tester'],
  ] as const) {
    const skills = sections[role]
    const installed = hasExactFile(repoPath('.cursor', 'skills', name), 'SKILL.md')
    if (installed) expect(skills, `${role} points at ${name}`).toContain(name)
    else expect(skills, `${role} does not point at rejected ${name}`).not.toContain(name)
  }
  if (sections.spec.includes('frontend-design')) expect(sections.spec).toMatch(/popup|options/i)
  if (sections.dev.includes('frontend-design')) expect(sections.dev).toMatch(/popup|options/i)
  for (const row of rows) {
    if (row.decision !== 'reject') continue
    for (const skills of Object.values(sections)) {
      expect(skills.includes(row.skill), `rejected ${row.skill} has no role path`).toBe(false)
    }
    expect(existsSync(repoPath('.cursor', 'skills', ...row.skill.split('/'))), `${row.skill} is not vendored`).toBe(
      false,
    )
  }
  for (const skills of Object.values(sections)) {
    for (const name of skillDirectoryNames()) {
      const text = skillText(name)
      const body = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(text)?.[1] ?? ''
      expect(sharesBody(skills, body), `${name} body is not pasted into a role file`).toBe(false)
    }
  }
})

test('AC-6: saved probe replies pass the Scope F checks', () => {
  const markdown = readRepo('docs/ai-readiness.md')
  const rows = probeRows(markdown)
  const blocks = replyBlocks(markdown)
  const register = loadRegister()
  const prompts: Record<number, string> = {
    1: 'Write a Playwright test that toggles the extension OFF and checks the badge',
    2: 'Add a new permission X',
    3: 'A background variable resets after a while',
    4: 'Restyle the popup',
    5: 'Prepare the store submission',
  }
  const expected: Record<number, RegExp> = {
    1: /extension-e2e-testing/,
    2: /MV3/,
    3: /MV3/,
    4: /frontend-design/,
    5: /release-checklist/,
  }
  const checks = [checkProbe1, checkProbe2, checkProbe3, checkProbe4, checkProbe5]
  for (const probe of [1, 2, 3, 4, 5]) {
    const matching = rows.filter((row) => probeNumber(row) === probe)
    expect(matching.length, `probe ${probe} row`).toBeGreaterThan(0)
    const latestRow = [...matching].reverse().find((row) => !isFirstRunRow(row)) ?? matching.at(-1)
    if (!latestRow) return
    expect(flat(latestRow.prompt)).toContain(prompts[probe])
    expect(latestRow.expected).toMatch(expected[probe])
    expect(['yes', 'no', 'not observable']).toContain((latestRow.triggered ?? '').trim().toLowerCase())
    const reply = latestReply(blocks, probe)
    for (const row of matching) {
      const followed = row.followed.trim().toLowerCase()
      expect(['yes', 'no']).toContain(followed)
      const evidenceWords = row.evidence.trim().split(/\s+/).filter(Boolean)
      expect(evidenceWords.length, `probe ${probe} evidence`).toBeGreaterThan(0)
      expect(evidenceWords.length, `probe ${probe} evidence word count`).toBeLessThanOrEqual(40)
      if (followed === 'yes') expect(row.fix.trim().toLowerCase(), `probe ${probe} fix`).toBe('none')
      else expect(row.fix.trim().toLowerCase(), `probe ${probe} fix`).not.toBe('none')
      const matchedReply = isFirstRunRow(row)
        ? (blocks.find((block) => block.probe === probe && block.firstRun)?.body ?? '')
        : (reply ?? '')
      const sources = [
        matchedReply,
        row.fix,
        register.find((item) => item.skill === 'frontend-design')?.reason ?? '',
      ]
      expect(sources.map(flat).join('\n'), `probe ${probe} evidence quotes the reply`).toContain(
        flat(row.evidence).replace(/^["']+|["']+$/g, ''),
      )
    }
    const frontend = register.find((row) => row.skill === 'frontend-design')
    const installed =
      hasExactFile(repoPath('.cursor', 'skills', 'frontend-design'), 'SKILL.md') || frontend?.decision === 'accept'
    if (probe === 4 && !installed) {
      if (latestRow.followed.trim().toLowerCase() === 'yes') {
        expect(reply, 'probe 4 reply').toBeTruthy()
        if (reply) checkProbe4(reply)
      } else {
        expect(frontend, 'frontend-design register row').toBeTruthy()
        if (frontend) expect(sameReason(latestRow.fix, frontend.reason), 'probe 4 fix is the reject reason').toBe(true)
        const probeBlocks = blocks.filter((block) => block.probe === 4)
        const rerun = probeBlocks.some((block) => block.firstRun) && probeBlocks.some((block) => !block.firstRun)
        expect(rerun, 'rejected frontend-design probe 4 is not run again').toBe(false)
      }
      continue
    }
    expect(latestRow.followed.trim().toLowerCase(), `probe ${probe} followed`).toBe('yes')
    expect(reply, `probe ${probe} saved reply`).toBeTruthy()
    if (reply) checks[probe - 1](reply)
  }
})

test('AC-7: the Dev done gate lists four commands and the generic prompt drops the 003 reverse suite', () => {
  const roleDev = readRepo('.cursor/agents/role-dev.md')
  const done = section(roleDev, 'DONE')
  for (const command of DEV_COMMANDS) {
    expect(done, `DONE lists ${command}`).toContain(command)
  }
  const step4 = roleDev.split(/\r?\n/).find((line) => /^\s*4\./.test(line)) ?? ''
  for (const command of DEV_COMMANDS) {
    expect(step4, `step 4 lists ${command}`).toContain(command)
  }
  const core = readRepo('.cursor/rules/project-core.mdc')
  expect(core, 'project-core points at role-dev').toContain('.cursor/agents/role-dev.md')
  expect(core, 'project-core does not list its own done gate').not.toMatch(/run lint, typecheck, and tests/i)
  for (const command of DEV_COMMANDS) {
    expect(core, `project-core does not list ${command}`).not.toContain(command)
  }
  const feature = readRepo('.cursor/commands/feature.md')
  expect(feature, '003 reverse suite sentence is removed').not.toContain('test:e2e:reverse')
  expect(feature, 'break-it proof sentence is removed').not.toContain('break-it proof')
  const stages = [
    '## 0. Preconditions',
    '## 1. Spec',
    '## 2. QA — maximum 2 rounds',
    '## 3. Tester Phase 1 — maximum 2 launches',
    '## 4. Dev — maximum 3 attempts',
    '## 5. Tester Phase 2 — maximum 2 fix rounds',
    '## 6. Commits and push',
    '## 7. PR description',
    '## 8. Run log',
    '## 9. Stop',
  ]
  let position = -1
  for (const stage of stages) {
    const next = feature.indexOf(stage)
    expect(next, stage).toBeGreaterThan(position)
    position = next
  }
})

test('AC-9: glossary defines rule, mock, header rule, and state', () => {
  const glossary = readRepo('docs/glossary.md')
  const table = parseTables(glossary).find((rows) => {
    const header = rows[0]?.map((cell) => cell.toLowerCase()) ?? []
    return header.includes('term') && header.includes('meaning')
  })
  expect(table, 'glossary table').toBeTruthy()
  if (!table) return
  const header = table[0].map((cell) => cell.toLowerCase())
  const termIndex = header.indexOf('term')
  const meaningIndex = header.indexOf('meaning')
  const meanings = new Map<string, string>()
  for (const cells of table.slice(1)) {
    meanings.set(flat(cells[termIndex] ?? '').toLowerCase(), flat(cells[meaningIndex] ?? ''))
  }
  expect([...meanings.keys()].sort()).toEqual(['header rule', 'mock', 'rule', 'state'])
  expect(meanings.get('rule')).toBe(flat('One `MockRule` in `chrome.storage.local` under `rules`.'))
  expect(meanings.get('mock')).toBe(
    flat(
      'The fake response for a matching request: status, body, response headers, `delayMs`. Not a second stored object.',
    ),
  )
  expect(meanings.get('header rule')).toBe(
    flat(
      'A `{ key, value }` entry in `responseHeaders` on a rule. Not a separate rule type. No request-header matching.',
    ),
  )
  expect(meanings.get('state')).toBe(
    flat(
      '`settings.extensionEnabled` plus the rules. In Playwright, `readExtensionState` also returns `badgeText` (`ON` or `OFF`) and `title`.',
    ),
  )
})

test('AC-10: cursor indexing ignore lists dist, dependencies, and Playwright output', () => {
  const text = readRepo('.cursorindexingignore')
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
  for (const entry of [
    'dist/',
    'node_modules/',
    'playwright-report/',
    'test-results/',
    'blob-report/',
    'playwright/.cache/',
  ]) {
    expect(entries, entry).toContain(entry)
  }
  for (const blocked of [
    'src/',
    'e2e/',
    'specs/',
    'docs/',
    'AGENTS.md',
    '.cursor/agents/',
    'dist/content/interceptor.js',
    'dist/content/bridge.js',
  ]) {
    expect(entries, `${blocked} stays readable`).not.toContain(blocked)
  }
  expect(existsSync(repoPath('.cursorignore')), '.cursorignore is not added').toBe(false)
})

test('AC-11: dependabot schedules npm and github-actions monthly and ignores jimp', () => {
  const text = readRepo('.github/dependabot.yml')
  const ecosystems = [...text.matchAll(/package-ecosystem:\s*["']?(npm|github-actions)["']?/g)].map((match) => match[1])
  expect(ecosystems).toContain('npm')
  expect(ecosystems).toContain('github-actions')
  const monthly = text.match(/interval:\s*["']?monthly["']?/g) ?? []
  expect(monthly.length, 'both ecosystems are monthly').toBeGreaterThanOrEqual(2)
  const withoutComments = text.replace(/#[^\n]*/g, '')
  expect(withoutComments, 'jimp is ignored').toMatch(/ignore:[\s\S]{0,400}jimp/)
})

test('AC-12: Playwright MCP section says not installed and names the two risks', () => {
  const sectionText = section(readRepo('docs/ai-readiness.md'), 'Playwright MCP')
  expect(sectionText).toContain('not installed')
  expect(sectionText).toMatch(/browser control/i)
  expect(sectionText).toMatch(/network access/i)
})

test('AC-13: the register reviews every Scope A candidate', () => {
  const rows = loadRegister()
  expect(rows.some((row) => row.skill === 'currents-dev'), 'currents-dev is not its own row').toBe(false)
  for (const name of CANDIDATES) {
    const row = rows.find((item) => item.skill === name || `${item.skill} ${item.reason} ${item.review}`.includes(name))
    expect(row, `${name} review row`).toBeTruthy()
    if (!row) return
    expect(['accept', 'reject']).toContain(row.decision)
    expect(row.review.length, `${name} review`).toBeGreaterThan(0)
    expect(row.owner, `${name} owner`).toBe('maintainer')
    expect(row.dateAdded, `${name} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    if (row.decision === 'reject') {
      expect(existsSync(repoPath('.cursor', 'skills', ...row.skill.split('/'))), `${name} is not vendored`).toBe(false)
    }
  }
  const playwright = rows.find((row) => row.skill === 'playwright-best-practices')
  expect(playwright, 'playwright-best-practices row').toBeTruthy()
  if (!playwright) return
  expect(playwright.sourceUrl).toContain('currents-dev')
  expect(playwright.reason).toContain('currents-dev')
})

test('AC-14: AGENTS.md has the ten Scope C headings and keeps the prohibitions', () => {
  const agents = readRepo('AGENTS.md')
  expect(h2(agents), 'AGENTS.md h2 headings').toEqual(AGENTS_HEADINGS)
  const commands = section(agents, 'Commands')
  expect(commands).toContain('chrome://extensions')
  expect(commands).toContain('reload the app tab')
  expect(commands).toMatch(/does not hot-reload/)
  const prohibitions = [
    /src\/content\/interceptor\.ts/,
    /zero imports?/i,
    /synchronously/i,
    /__ninja_interceptor_bridge__/,
    /"world": "MAIN"/,
    /"world": "ISOLATED"/,
    /declarativeNetRequest/,
    /emptyOutDir: false/,
    /`lib` mode/,
    /jimp/,
    /0\.22/,
    /findMatch/,
    /protocol-stripped/,
    /XMLHttpRequest\.prototype/,
    /readystatechange/,
    /loadend/,
    /window\.confirm\(\)/,
    /commit to `main`/,
    /\.env/,
    /justification/i,
    /destructive/i,
    /only content script that may call|only content script that calls/i,
    /Patching twice|re-run the patch|second patch/i,
  ]
  for (const prohibition of prohibitions) {
    expect(agents, prohibition.source).toMatch(prohibition)
  }
  const skills = section(agents, 'Skills')
  expect(skills).toContain('.cursor/skills/')
  expect(skills).toContain('docs/ai-skills.md')
  expect(skills).toMatch(/do not override|does not override|don't override/i)
  expect(skills).toContain('project-core')
  expect(section(agents, 'Architecture')).toContain('docs/architecture.md')
})

test('AC-15: the workflow points at the AGENTS.md command table and docs/testing.md', () => {
  const workflow = readRepo('docs/agent-workflow.md')
  expect(workflow, 'command table is gone').not.toMatch(/\|\s*Command\s*\|\s*What it does\s*\|/)
  expect(workflow).toContain('AGENTS.md')
  expect(workflow).toMatch(/command table/i)
  const step8 = /8\.\s+\*\*PR → CI → merge\.\*\*[\s\S]*?(?=\n\n)/.exec(workflow)?.[0] ?? ''
  expect(step8, 'step 8 exists').not.toBe('')
  expect(step8).toContain('docs/testing.md')
  expect(step8, 'step 8 CI sentences are replaced').not.toContain('lists flaky tests')
  expect(workflow).toContain('specs/003-improve-playwright-tests-coverage.md')
  expect(workflow).toContain('Phase 1: skip')
  const flow = section(workflow, 'Flow')
  const stages = [
    '1. **Idea.**',
    '2. **Spec.**',
    '3. **QA requirements review.**',
    '4. **Tester Phase 1.**',
    '5. **Dev.**',
    '6. **Tester Phase 2.**',
    '7. **You: manual test.**',
    '8. **PR → CI → merge.**',
  ]
  let position = -1
  for (const stage of stages) {
    const next = flow.indexOf(stage)
    expect(next, stage).toBeGreaterThan(position)
    position = next
  }
  expect(workflow).toContain('## Example prompts')
})

test('AC-16: architecture and testing docs include the Scope C bullets', () => {
  const architecture = readRepo('docs/architecture.md')
  const architectureChecks: Array<[string, RegExp]> = [
    ['popup', /popup/i],
    ['options', /options/i],
    ['service worker', /service worker/i],
    ['bridge', /bridge/i],
    ['ISOLATED', /ISOLATED/],
    ['interceptor', /interceptor/i],
    ['MAIN', /MAIN/],
    ['fetch', /fetch/],
    ['XHR', /XHR/],
    ['findMatch', /findMatch/],
    ['fake or real response', /fake response|real request/i],
    ['storage helper', /src\/shared\/storage\.ts/],
    ['chrome.storage.local', /chrome\.storage\.local/],
    ['onChanged', /onChanged/],
    ['postMessage', /postMessage/],
    ['closure', /closure/],
    ['onInstalled', /onInstalled/],
    ['badge', /badge/i],
    ['install', /install/i],
    ['startup', /startup/i],
    ['toolbarPaintGeneration', /toolbarPaintGeneration/],
    ['storage permission', /\bstorage\b/],
    ['all_urls', /<all_urls>/],
    ['localhost', /localhost/],
    ['declarativeNetRequest', /declarativeNetRequest/],
    ['AGENTS.md', /AGENTS\.md/],
  ]
  for (const [label, pattern] of architectureChecks) {
    expect(architecture, label).toMatch(pattern)
  }
  const copied = ['emptyOutDir', 'window.confirm', 'readystatechange', 'jimp', 'zero import'].filter((marker) =>
    architecture.includes(marker),
  )
  expect(copied.length, 'architecture.md does not copy the hard-rule list').toBeLessThan(3)
  const testing = readRepo('docs/testing.md')
  for (const needle of [
    'npm test',
    'npm run test:e2e',
    'launchExtension',
    'extensionIdFrom',
    'readExtensionState',
    'openProbe',
    'PROBE_ORIGIN',
    'verify',
    'e2e',
    '.github/workflows/ci.yml',
    'flaky',
    'report',
    'traces',
    'screenshots',
    '.cursor/skills/extension-e2e-testing/SKILL.md',
  ]) {
    expect(testing, needle).toContain(needle)
  }
})

test('AC-17: project-core keeps ROLE BOUNDARIES and points guardrails at AGENTS.md', () => {
  const core = readRepo('.cursor/rules/project-core.mdc')
  for (const bullet of [
    'No destructive commands',
    'Show a short plan before any multi-file change',
    'Always list what you did NOT verify',
    'No new dependencies without a written justification in the PR',
  ]) {
    expect(core, `guardrail list is not repeated: ${bullet}`).not.toContain(bullet)
  }
  const lines = core.split(/\r?\n/)
  const nearby = (left: RegExp, right: RegExp) =>
    lines.some((_, index) => {
      const window = lines.slice(Math.max(0, index - 2), index + 3).join('\n')
      return left.test(window) && right.test(window)
    })
  expect(nearby(/guardrail/i, /AGENTS\.md/), 'guardrails point at AGENTS.md').toBe(true)
  expect(nearby(/hard rule/i, /AGENTS\.md/), 'hard rules point at AGENTS.md').toBe(true)
  expect(core).toContain('## ROLE BOUNDARIES')
  expect(core).toContain('alwaysApply: true')
})
