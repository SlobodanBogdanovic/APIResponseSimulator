import { expect, test } from './extension'

test('unpacked extension options page shows the product name', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options/index.html`)
  await expect(page.getByRole('heading', { name: 'API Response Simulator' })).toBeVisible()
})

test('unpacked extension popup shows the product name', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`)
  await expect(page.getByText('API Response Simulator')).toBeVisible()
})
