import { createRule, expect, openExtensionPage, ruleCard, test } from './extension'

test('B4: creating a rule shows it on the options page', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '201',
    responseBody: '{"source":"mock"}',
    delayMs: '0',
    headers: [{ key: 'X-Mock-Test', value: 'yes' }],
  })

  const card = ruleCard(options, 'Users')
  await expect(card).toContainText('Users')
  await expect(card).toContainText('GET')
  await expect(card).toContainText('201')
  await expect(card).toContainText('127.0.0.1:4173/api/users')
})

test('B5: editing a rule keeps the new name and response body', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '201',
    responseBody: '{"source":"mock"}',
  })

  await ruleCard(options, 'Users').getByTestId('rule-edit').click()
  await options.getByTestId('rule-name').fill('Users edited')
  await options.getByTestId('rule-response-body').fill('{"source":"edited"}')
  await options.getByTestId('save-rule').click()

  await expect(ruleCard(options, 'Users edited')).toBeVisible()
  await ruleCard(options, 'Users edited').getByTestId('rule-edit').click()
  await expect(options.getByTestId('rule-response-body')).toHaveValue('{"source":"edited"}')
})

test('B6: confirming delete removes the rule and cancel keeps it', async ({ context, extensionId }) => {
  const options = await openExtensionPage(context, extensionId, 'options')
  await createRule(options, {
    name: 'Users',
    urlPattern: '127.0.0.1:4173/api/users',
    method: 'GET',
    statusCode: '200',
    responseBody: '{"source":"mock"}',
  })

  const card = ruleCard(options, 'Users')
  await card.getByTestId('rule-delete').click()
  await card.getByTestId('rule-delete-cancel').click()
  await expect(card).toBeVisible()

  await card.getByTestId('rule-delete').click()
  await card.getByTestId('rule-delete-confirm').click()
  await expect(card).toHaveCount(0)
  await expect(options.getByText('No rules yet. Add your first rule.')).toBeVisible()
})
