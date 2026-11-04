import type { BrowserContext } from '@playwright/test'
import {
  createProfileDir,
  createRule,
  deleteProfileDir,
  expect,
  extensionIdFrom,
  launchExtension,
  openExtensionPage,
  openProbe,
  pollProbe,
  ruleCard,
  serverBody,
  test,
} from './extension'

test('B11: rules and the on/off setting persist after the context reopens in the on state and in the off state', async () => {
  test.setTimeout(60_000)
  const dir = await createProfileDir()
  const contexts: BrowserContext[] = []
  const closeAll = async () => {
    for (const context of contexts) {
      await context.close().catch(() => undefined)
    }
  }

  try {
    const first = await launchExtension(dir)
    contexts.push(first)
    const firstId = await extensionIdFrom(first)
    const options = await openExtensionPage(first, firstId, 'options')
    await createRule(options, {
      name: 'Users',
      urlPattern: '127.0.0.1:4173/api/users',
      method: 'GET',
      statusCode: '201',
      responseBody: '{"source":"mock"}',
    })
    const probe = await openProbe(first)
    await pollProbe(probe, 'fetch-get-users', {
      status: 201,
      body: '{"source":"mock"}',
    })
    await first.close()

    const second = await launchExtension(dir)
    contexts.push(second)
    const secondId = await extensionIdFrom(second)
    const optionsAgain = await openExtensionPage(second, secondId, 'options')
    await expect(ruleCard(optionsAgain, 'Users')).toBeVisible()
    const probeAgain = await openProbe(second)
    await pollProbe(probeAgain, 'fetch-get-users', {
      status: 201,
      body: '{"source":"mock"}',
    })
    const popup = await openExtensionPage(second, secondId, 'popup')
    await popup.getByTestId('global-toggle').click()
    await expect(popup.getByTestId('global-toggle')).toHaveAttribute('title', 'Enable extension')
    await expect(popup.getByTestId('extension-disabled')).toBeVisible()
    await second.close()

    const third = await launchExtension(dir)
    contexts.push(third)
    const thirdId = await extensionIdFrom(third)
    const optionsOff = await openExtensionPage(third, thirdId, 'options')
    await expect(ruleCard(optionsOff, 'Users')).toBeVisible()
    const popupOff = await openExtensionPage(third, thirdId, 'popup')
    await expect(popupOff.getByTestId('extension-disabled')).toBeVisible()
    const probeOff = await openProbe(third)
    await pollProbe(probeOff, 'fetch-get-users', {
      status: 200,
      body: serverBody('GET', '/api/users'),
      serverHeader: 'yes',
      mockHeader: null,
    })
    await third.close()
  } finally {
    await closeAll()
    await deleteProfileDir(dir)
  }
})
