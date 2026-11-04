import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

const resultsPath = 'test-results/results.json'

function walk(suite, flaky, failed) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = [...(test.results ?? [])].sort((a, b) => (a.retry ?? 0) - (b.retry ?? 0))
      const flakyTest = results.some((result, index) => {
        if (result.status !== 'passed') return false
        return results.slice(0, index).some((prev) => prev.status === 'failed' || prev.status === 'timedOut')
      })
      if (flakyTest) flaky.push(spec.title)

      const last = results[results.length - 1]
      const failedLast = last && (last.status === 'failed' || last.status === 'timedOut' || last.status === 'interrupted')
      if (failedLast || (results.length === 0 && test.status === 'unexpected')) {
        failed.push(spec.title)
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child, flaky, failed)
}

function linesOr(titles, emptyLine) {
  return titles.length > 0 ? titles.join('\n') : emptyLine
}

function reportText(flaky, failed) {
  return [
    '## Flaky tests',
    linesOr(flaky, 'No flaky tests.'),
    '',
    '## Failed tests',
    linesOr(failed, 'No failed tests.'),
    '',
  ].join('\n')
}

let text = reportText([], [])
try {
  if (existsSync(resultsPath)) {
    const report = JSON.parse(readFileSync(resultsPath, 'utf8'))
    const flaky = []
    const failed = []
    for (const suite of report.suites ?? []) walk(suite, flaky, failed)
    text = reportText(flaky, failed)
  }
} catch {
  text = reportText([], [])
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY
if (summaryPath) appendFileSync(summaryPath, text)
else process.stdout.write(text)

process.exit(0)
