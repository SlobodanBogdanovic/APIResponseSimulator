import {
  clickProbe,
  createRule,
  expect,
  expectPageNotReloaded,
  markPage,
  openExtensionPage,
  openProbe,
  pollProbe,
  popupRule,
  serverBody,
  test,
} from './extension'

const usersRule = {
  name: 'Users',
  urlPattern: '127.0.0.1:4173/api/users',
  method: 'GET',
  statusCode: '201',
  responseBody: '{"source":"mock"}',
}

test('B7: matching fetch returns the mocked status, body, and custom response header only for that request', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    ...usersRule,
    delayMs: '0',
    headers: [{ key: 'X-Mock-Test', value: 'yes' }],
  })
  const probe = await openProbe(context)

  await pollProbe(probe, 'fetch-get-users', {
    status: 201,
    body: '{"source":"mock"}',
    contentType: 'application/json',
    mockHeader: 'yes',
    serverHeader: null,
    events: [],
  })

  const other = await clickProbe(probe, 'fetch-get-other')
  expect(JSON.parse(other.body)).toEqual({ source: 'server', method: 'GET', path: '/api/other' })
  expect(other.serverHeader).toBe('yes')
  expect(other.mockHeader).toBeNull()
})

test('B8: matching XHR returns the mocked status and body and fires readystatechange, load, then loadend', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, usersRule)
  const probe = await openProbe(context)

  await pollProbe(probe, 'xhr-get-users', {
    status: 201,
    body: '{"source":"mock"}',
    events: ['readystatechange', 'load', 'loadend'],
  })
})

test('B9: non-matching fetch returns the test server response', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, usersRule)
  const probe = await openProbe(context)

  await pollProbe(probe, 'fetch-get-users', { body: '{"source":"mock"}' })
  const other = await clickProbe(probe, 'fetch-get-other')
  expect(JSON.parse(other.body)).toEqual({ source: 'server', method: 'GET', path: '/api/other' })
  expect(other.serverHeader).toBe('yes')
})

test('B10: global off returns the real response and global on returns the mock without reloading the page', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, usersRule)
  const probe = await openProbe(context)
  await markPage(probe)
  await pollProbe(probe, 'fetch-get-users', { body: '{"source":"mock"}' })

  const popup = await openExtensionPage(context, extensionId, 'popup')
  const toggle = popup.getByTestId('global-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Enable extension')
  await expect(popup.getByTestId('extension-disabled')).toBeVisible()
  await pollProbe(probe, 'fetch-get-users', {
    body: serverBody('GET', '/api/users'),
    serverHeader: 'yes',
    mockHeader: null,
  })

  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Disable extension')
  await pollProbe(probe, 'fetch-get-users', {
    status: 201,
    body: '{"source":"mock"}',
    serverHeader: null,
  })
  await expectPageNotReloaded(probe)
})

test('B16: popup active count and rule toggle follow the rule', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, usersRule)
  const popup = await openExtensionPage(context, extensionId, 'popup')
  await expect(popup.getByText('1 of 1 rule active', { exact: true })).toBeVisible()
  await expect(popupRule(popup, 'Users')).toBeVisible()

  const probe = await openProbe(context)
  await markPage(probe)
  await pollProbe(probe, 'fetch-get-users', { body: '{"source":"mock"}' })
  await popup.getByTestId('popup-rule-toggle').click()
  await expect(popup.getByText('0 of 1 rule active', { exact: true })).toBeVisible()
  await pollProbe(probe, 'fetch-get-users', {
    body: serverBody('GET', '/api/users'),
    serverHeader: 'yes',
  })
  await expectPageNotReloaded(probe)
})
