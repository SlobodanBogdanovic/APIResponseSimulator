import {
  clickProbe,
  createRule,
  expect,
  expectPageNotReloaded,
  extensionServiceWorker,
  markPage,
  openExtensionPage,
  openProbe,
  pollProbe,
  readExtensionState,
  reloadExtensionFromServiceWorker,
  ruleCard,
  serverBody,
  test,
} from './extension'

test('E1: service worker restart keeps stored rules and the mocked response', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '201',
    responseBody: '{"source":"mock"}',
  })
  const probe = await openProbe(context)
  await pollProbe(probe, 'fetch-get-users', {
    status: 201,
    body: '{"source":"mock"}',
  })

  await reloadExtensionFromServiceWorker(context, extensionId)
  await probe.reload()
  await pollProbe(probe, 'fetch-get-users', {
    status: 201,
    body: '{"source":"mock"}',
  })

  const state = await readExtensionState(extensionServiceWorker(context, extensionId))
  expect(state.settings.extensionEnabled).toBe(true)
  expect(state.rules.some((rule) => rule.name === 'Users')).toBe(true)
})

test('E2: rapid global toggling ends on the last chosen state', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '201',
    responseBody: '{"source":"mock"}',
  })
  const probe = await openProbe(context)
  await markPage(probe)
  const popup = await openExtensionPage(context, extensionId, 'popup')
  const toggle = popup.getByTestId('global-toggle')
  await expect(toggle).toHaveAttribute('title', 'Disable extension')

  const titles = [
    'Enable extension',
    'Disable extension',
    'Enable extension',
    'Disable extension',
    'Enable extension',
  ]
  for (const title of titles) {
    await toggle.click()
    await expect(toggle).toHaveAttribute('title', title)
  }
  await pollProbe(probe, 'fetch-get-users', { body: serverBody('GET', '/api/users') })

  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Disable extension')
  await pollProbe(probe, 'fetch-get-users', { body: '{"source":"mock"}' })
  await expectPageNotReloaded(probe)
})

test('E3: a rule with special characters and an empty body is returned unchanged', async ({ context, extensionId }) => {
  const name = 'Quotes "and" <tags> & more'
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name,
    urlPattern: '127.0.0.1:4173/api/a.b(c)',
    method: 'GET',
    statusCode: '200',
    responseBody: '',
  })
  await expect(ruleCard(options, name)).toBeVisible()
  await expect(ruleCard(options, name)).toContainText(name)

  const probe = await openProbe(context)
  await pollProbe(probe, 'fetch-get-special', {
    status: 200,
    body: '',
    contentType: 'application/json',
  })
})

test('E4: a large response body is returned unchanged', async ({ context, extensionId }) => {
  const body = `${'a'.repeat(32000)}END`
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Large',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '200',
    responseBody: body,
  })
  const probe = await openProbe(context)
  await pollProbe(probe, 'fetch-get-users', {
    status: 200,
    body,
  })
})

test('E5: the first enabled matching rule wins until it is disabled', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'First rule',
    urlPattern: '127.0.0.1:4173/api/*',
    method: 'GET',
    statusCode: '200',
    responseBody: '{"n":1}',
  })
  await createRule(options, {
    name: 'Second rule',
    urlPattern: '127.0.0.1:4173/api/*',
    method: 'GET',
    statusCode: '200',
    responseBody: '{"n":2}',
  })

  const probe = await openProbe(context)
  await markPage(probe)
  await pollProbe(probe, 'fetch-get-users', { body: '{"n":1}' })
  await ruleCard(options, 'First rule').getByTestId('rule-enabled-toggle').click()
  await pollProbe(probe, 'fetch-get-users', { body: '{"n":2}' })
  await expectPageNotReloaded(probe)
})

test('E6: a POST rule does not mock a GET to the same URL', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Post only',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'POST',
    statusCode: '200',
    responseBody: '{"n":"post"}',
  })
  const probe = await openProbe(context)
  await pollProbe(probe, 'fetch-post-users', { body: '{"n":"post"}' })
  const getResult = await clickProbe(probe, 'fetch-get-users')
  expect(getResult.body).toBe(serverBody('GET', '/api/users'))
})
