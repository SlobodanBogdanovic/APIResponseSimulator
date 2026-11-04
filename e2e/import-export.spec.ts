import {
  createRule,
  expect,
  extensionServiceWorker,
  importRulesFile,
  openExtensionPage,
  openProbe,
  pollProbe,
  readDownload,
  readExtensionState,
  ruleCard,
  test,
} from './extension'

test('B13: export downloads the rules JSON and import appends them with new ids', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '201',
    responseBody: '{"source":"mock"}',
    headers: [{ key: 'X-Mock-Test', value: 'yes' }],
  })

  const before = await readExtensionState(extensionServiceWorker(context, extensionId))
  const originalId = before.rules[0]?.id
  expect(originalId).toBeTruthy()

  const downloadPromise = options.waitForEvent('download')
  await options.getByTestId('export-rules').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^api-response-simulator-rules-\d{4}-\d{2}-\d{2}\.json$/)

  const text = await readDownload(download)
  const parsed = JSON.parse(text) as {
    version: number
    exportedAt: string
    rules: Array<{
      name: string
      urlPattern: string
      method: string
      statusCode: number
      responseBody: string
      responseHeaders: Array<{ key: string; value: string }>
    }>
  }
  expect(parsed.version).toBe(1)
  expect(typeof parsed.exportedAt).toBe('string')
  expect(parsed.rules).toHaveLength(1)
  expect(parsed.rules[0]).toMatchObject({
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: 201,
    responseBody: '{"source":"mock"}',
    responseHeaders: [{ key: 'X-Mock-Test', value: 'yes' }],
  })

  await importRulesFile(options, text, download.suggestedFilename())
  await expect(ruleCard(options, 'Users')).toHaveCount(2)

  const after = await readExtensionState(extensionServiceWorker(context, extensionId))
  expect(after.rules).toHaveLength(2)
  expect(after.rules[0]?.id).toBe(originalId)
  expect(after.rules[1]?.id).not.toBe(originalId)

  await options.locator('[data-testid="rule-card"][data-rule-name="Users"]').nth(0).getByTestId('rule-enabled-toggle').click()
  const probe = await openProbe(context)
  await pollProbe(probe, 'fetch-get-users', {
    status: 201,
    body: '{"source":"mock"}',
    mockHeader: 'yes',
  })
})

test('B14: invalid import shows an error and a mixed file skips invalid rules', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await importRulesFile(options, 'not-json', 'bad.json')
  await expect(options.getByTestId('import-export-status')).toHaveText('File is not valid JSON.')

  await importRulesFile(
    options,
    '{"version":1,"rules":[{"name":"Ok","urlPattern":"127.0.0.1:4173/api/users","method":"GET","statusCode":200},{"name":""}]}',
    'mixed.json',
  )
  await expect(options.getByTestId('import-export-status')).toHaveText('Imported 1 rule (skipped 1 invalid).')
  await expect(ruleCard(options, 'Ok')).toBeVisible()
  await expect(options.getByTestId('rule-card')).toHaveCount(1)
})

test('B15: export is disabled when there are no rules', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await expect(options.getByTestId('export-rules')).toBeDisabled()
})
