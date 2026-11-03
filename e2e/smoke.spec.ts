import {
  expect,
  extensionServiceWorker,
  readExtensionState,
  test,
} from './extension'

test('B1: unpacked extension options page shows the product name', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options/index.html`)
  await expect(page.getByRole('heading', { name: 'API Response Simulator' })).toBeVisible()
})

test('B2: unpacked extension popup shows the product name', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`)
  await expect(page.getByText('API Response Simulator')).toBeVisible()
})

test('B3: service worker is running and stored state is readable', async ({ context, extensionId }) => {
  expect(extensionId).not.toBe('')
  const state = await readExtensionState(extensionServiceWorker(context, extensionId))
  expect(state.rules).toBeDefined()
  expect(state.settings).toBeDefined()
})
