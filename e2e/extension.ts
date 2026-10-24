import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, chromium, type BrowserContext } from '@playwright/test'

const extensionPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({}, use) => {
    const manifestPath = path.join(extensionPath, 'manifest.json')
    if (!existsSync(manifestPath)) {
      throw new Error(`Extension build not found at ${extensionPath}. Run npm run build first.`)
    }

    // Playwright's Chromium build still accepts --load-extension. Installed
    // Chrome and Edge do not. channel: 'chromium' is what allows headless loads.
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15_000 })
    }
    const extensionId = serviceWorker.url().split('/')[2]
    if (!extensionId) {
      throw new Error(`Could not read extension id from ${serviceWorker.url()}`)
    }
    await use(extensionId)
  },
})

export const expect = test.expect
