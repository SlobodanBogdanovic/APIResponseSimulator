/// <reference lib="dom" />
import type { BrowserContext, Locator, Page, Worker } from '@playwright/test'
import {
  createRule,
  expect,
  extensionServiceWorker,
  importRulesFile,
  openExtensionPage,
  popupRule,
  readExtensionState,
  ruleCard,
  test,
  type RuleInput,
} from './extension'

const INK = 'rgb(20, 32, 46)'
const PAPER = 'rgb(244, 247, 248)'
const WHITE = 'rgb(255, 255, 255)'
const SECONDARY = 'rgb(62, 76, 90)'
const LINE = 'rgb(107, 124, 140)'
const SIGNAL = 'rgb(11, 95, 78)'
const SIGNAL_PRESS = 'rgb(8, 74, 61)'
const IDLE = 'rgb(110, 124, 138)'
const DANGER = 'rgb(155, 35, 48)'
const INDIGO = 'rgb(79, 70, 229)'

const usersRule: RuleInput = {
  name: 'Users',
  urlPattern: '127.0.0.1:4173/api/users',
  method: 'GET',
  statusCode: '201',
  responseBody: '{"source":"mock"}',
  delayMs: '0',
}

const methodCards: Array<{ name: string; method: string; status: string; color: string }> = [
  { name: 'Get users', method: 'GET', status: '200', color: 'rgb(20, 108, 67)' },
  { name: 'Post users', method: 'POST', status: '201', color: 'rgb(29, 78, 137)' },
  { name: 'Put users', method: 'PUT', status: '202', color: 'rgb(138, 90, 0)' },
  { name: 'Delete users', method: 'DELETE', status: '204', color: 'rgb(155, 35, 48)' },
  { name: 'Patch users', method: 'PATCH', status: '400', color: 'rgb(91, 58, 140)' },
  { name: 'Any users', method: 'ANY', status: '500', color: 'rgb(62, 76, 90)' },
]

function durationMs(value: string): number {
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  if (parts.length === 0) return 0
  return Math.max(
    ...parts.map((part) => {
      if (part.endsWith('ms')) return Number.parseFloat(part)
      if (part.endsWith('s')) return Number.parseFloat(part) * 1000
      return 0
    }),
  )
}

async function openOptions(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await openExtensionPage(context, extensionId, 'options')
  await page.setViewportSize({ width: 1200, height: 900 })
  await expect(page.getByRole('heading', { name: 'API Response Simulator' })).toBeVisible()
  return page
}

async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await openExtensionPage(context, extensionId, 'popup')
  await page.setViewportSize({ width: 1200, height: 900 })
  await expect(page.getByText('API Response Simulator')).toBeVisible()
  return page
}

async function viewportBackground(page: Page): Promise<string> {
  return page.evaluate(() => {
    let node: Element | null = document.elementFromPoint(8, 8)
    while (node) {
      const color = getComputedStyle(node).backgroundColor
      if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color
      node = node.parentElement
    }
    return 'none'
  })
}

async function paintedBackground(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    let node: Element | null = el
    while (node) {
      const color = getComputedStyle(node).backgroundColor
      if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color
      node = node.parentElement
    }
    return 'none'
  })
}

async function indigoPaint(page: Page): Promise<string[]> {
  return page.evaluate((bad: string) => {
    const found: string[] = []
    const nodes = [document.documentElement, document.body, ...document.querySelectorAll('*')]
    for (const el of nodes) {
      const style = getComputedStyle(el)
      if (style.backgroundColor !== bad && style.color !== bad) continue
      const id = el.getAttribute('data-testid')
      const kind = style.backgroundColor === bad ? 'bg' : 'fg'
      found.push(`${kind} ${el.tagName}${id ? `[${id}]` : ''}`)
      if (found.length >= 6) break
    }
    return found
  }, INDIGO)
}

async function expectSolidBorder(locator: Locator, color: string): Promise<void> {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    await expect(locator).toHaveCSS(`border-${side}-width`, '1px')
    await expect(locator).toHaveCSS(`border-${side}-style`, 'solid')
    await expect(locator).toHaveCSS(`border-${side}-color`, color)
  }
}

async function expectPrimary(locator: Locator): Promise<void> {
  await expect(locator).toHaveCSS('background-color', SIGNAL)
  await expect(locator).toHaveCSS('color', WHITE)
}

async function expectSecondary(locator: Locator): Promise<void> {
  await expect(locator).toHaveCSS('background-color', WHITE)
  await expect(locator).toHaveCSS('color', INK)
  await expectSolidBorder(locator, LINE)
}

async function expectLeftBar(locator: Locator, color: string): Promise<void> {
  await expect(locator).toHaveCSS('border-left-width', '3px')
  await expect(locator).toHaveCSS('border-left-style', 'solid')
  await expect(locator).toHaveCSS('border-left-color', color)
}

async function expectInkFocus(locator: Locator): Promise<void> {
  await expect(locator).toHaveCSS('outline-style', 'solid')
  await expect(locator).toHaveCSS('outline-width', '2px')
  await expect(locator).toHaveCSS('outline-color', INK)
  await expect(locator).toHaveCSS('outline-offset', '2px')
}

async function expectTabbedInkFocus(page: Page, target: Locator): Promise<void> {
  await page.evaluate(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  })
  await page.locator('body').focus()
  for (let step = 0; step < 40; step += 1) {
    const focused = await target.evaluate((el) => el === document.activeElement)
    if (focused) break
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
  await expectInkFocus(target)
}

async function thumbSide(locator: Locator): Promise<'left' | 'right' | 'missing'> {
  const png = await locator.screenshot()
  return locator.page().evaluate(async (bytes: number[]): Promise<'left' | 'right' | 'missing'> => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(bytes)], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return 'missing'
    context.drawImage(bitmap, 0, 0)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    let minX = image.width
    let maxX = 0
    let count = 0
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const index = (y * image.width + x) * 4
        const red = image.data[index] ?? 0
        const green = image.data[index + 1] ?? 0
        const blue = image.data[index + 2] ?? 0
        const alpha = image.data[index + 3] ?? 0
        if (alpha <= 200 || red <= 245 || green <= 245 || blue <= 245) continue
        count += 1
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    if (count < 16) return 'missing'
    const center = (minX + maxX) / 2
    const middle = (image.width - 1) / 2
    if (Math.abs(center - middle) < 1) return 'missing'
    return center > middle ? 'right' : 'left'
  }, Array.from(png))
}

async function thumbMotionMs(locator: Locator): Promise<number> {
  const raw = await locator.evaluate((root) => {
    const durations: string[] = []
    for (const node of root.querySelectorAll('*')) {
      const rect = node.getBoundingClientRect()
      if (rect.width >= 12 && rect.width <= 20 && rect.height >= 12 && rect.height <= 20) {
        durations.push(getComputedStyle(node).transitionDuration)
      }
    }
    for (const pseudo of ['::before', '::after'] as const) {
      const style = getComputedStyle(root, pseudo)
      const width = Number.parseFloat(style.width)
      const height = Number.parseFloat(style.height)
      if (width >= 12 && width <= 20 && height >= 12 && height <= 20) {
        durations.push(style.transitionDuration)
      }
    }
    return durations[0] ?? '0s'
  })
  return durationMs(raw)
}

async function expectNoEntrance(locator: Locator): Promise<void> {
  await expect.poll(async () => {
    const value = await locator.evaluate((el) => {
      const style = getComputedStyle(el)
      return `${style.animationName}|${style.animationDuration}|${style.transitionDuration}`
    })
    const [name = '', animationDuration = '', transitionDuration = ''] = value.split('|')
    const animationStill = name === 'none' || durationMs(animationDuration) === 0
    return animationStill && durationMs(transitionDuration) === 0 ? 'still' : value
  }).toBe('still')
}

function namedField(page: Page, name: string): Locator {
  return page
    .getByRole('textbox', { name, exact: true })
    .or(page.getByRole('spinbutton', { name, exact: true }))
    .or(page.getByRole('combobox', { name, exact: true }))
}

async function iconPixel(page: Page, file: string, x: number, y: number): Promise<string> {
  return page.evaluate(async ({ file, x, y }) => {
    const chromeApi = (globalThis as unknown as {
      chrome: { runtime: { getURL: (path: string) => string } }
    }).chrome
    const response = await fetch(chromeApi.runtime.getURL(file))
    if (!response.ok) return `http-${response.status}`
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return 'no-context'
    context.drawImage(bitmap, 0, 0)
    const pixel = context.getImageData(x, y, 1, 1).data
    const hex = [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0]
      .map((part) => part.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    return `${bitmap.width}:${hex}`
  }, { file, x, y })
}

async function badgeRgb(worker: Worker): Promise<string> {
  const color = await worker.evaluate(() => new Promise<number[]>((resolve) => {
    const chromeApi = (globalThis as unknown as {
      chrome: {
        action: {
          getBadgeBackgroundColor: (details: object, callback: (value: number[]) => void) => void
        }
      }
    }).chrome
    chromeApi.action.getBadgeBackgroundColor({}, (value) => {
      resolve([value[0] ?? 0, value[1] ?? 0, value[2] ?? 0])
    })
  }))
  return color.join(',')
}

async function expectOnState(popup: Page): Promise<void> {
  const toggle = popup.getByTestId('global-toggle')
  const state = popup.getByTestId('extension-state')
  await expect(toggle).toHaveAttribute('title', 'Disable extension')
  await expect(state).toHaveText('On')
  await expect(state).toHaveCSS('color', SIGNAL)
  await expect(toggle).toHaveCSS('background-color', SIGNAL)
  await expect(toggle).toHaveCSS('width', '44px')
  await expect(toggle).toHaveCSS('height', '24px')
  await expect.poll(() => thumbSide(toggle)).toBe('right')
  await expect(popup.getByTestId('extension-disabled')).toHaveCount(0)
}

test('AC-1: options page and popup use the shared palette and heading type', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await expect.poll(() => viewportBackground(options)).toBe(PAPER)
  const column = options.getByTestId('options-column')
  await expect(column).toHaveCSS('width', '576px')
  const heading = options.getByRole('heading', { name: 'API Response Simulator' })
  await expect(heading).toHaveCSS('text-align', /^(left|start)$/)
  await expect(heading).toHaveCSS('font-size', '20px')
  await expect(heading).toHaveCSS('font-weight', '600')
  await expect(heading).toHaveCSS('color', INK)
  await expect.poll(() => indigoPaint(options)).toEqual([])

  const popup = await openPopup(context, extensionId)
  const productName = popup.getByText('API Response Simulator')
  await expect.poll(() => paintedBackground(productName)).toBe(WHITE)
  await expect(popup.locator('body')).toHaveCSS('max-width', '320px')
  await expect(popup.locator('body')).toHaveCSS('min-width', '280px')
  await expect(productName).toHaveCSS('color', INK)
  await expect.poll(() => indigoPaint(popup)).toEqual([])
})

test('AC-2: controls are 14px, meta text is 12px, and only the URL pattern is monospace', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const popup = await openPopup(context, extensionId)

  const productName = popup.getByText('API Response Simulator')
  await expect(productName).toHaveCSS('font-size', '14px')
  await expect(productName).not.toHaveCSS('font-family', /monospace/i)
  await expect(popup.getByText('1 of 1 rule active', { exact: true })).toHaveCSS('font-size', '12px')
  await expect(popupRule(popup, usersRule.name).getByText(usersRule.urlPattern, { exact: true })).toHaveCSS('font-size', '12px')
  await expect(popup.getByTestId('open-settings')).toHaveCSS('font-size', '14px')

  await expect(options.getByText('Manage your HTTP mock rules', { exact: true })).toHaveCSS('font-size', '12px')
  await expect(ruleCard(options, usersRule.name).getByText(usersRule.urlPattern, { exact: true })).toHaveCSS('font-size', '12px')
  for (const testId of ['add-rule', 'import-rules', 'export-rules']) {
    await expect(options.getByTestId(testId)).toHaveCSS('font-size', '14px')
  }
  const card = ruleCard(options, usersRule.name)
  await expect(card.getByTestId('rule-edit')).toHaveCSS('font-size', '14px')
  await expect(card.getByTestId('rule-delete')).toHaveCSS('font-size', '14px')

  await options.getByTestId('add-rule').click()
  await expect(options.getByRole('heading', { name: 'New rule' })).toBeVisible()
  await expect(options.getByTestId('rule-url-pattern')).toHaveCSS('font-family', /monospace/i)
  await expect(options.getByTestId('rule-name')).not.toHaveCSS('font-family', /monospace/i)
  await expect(options.getByTestId('save-rule')).toHaveCSS('font-size', '14px')
  await expect(options.getByTestId('cancel-rule')).toHaveCSS('font-size', '14px')
  await options.getByTestId('cancel-rule').click()

  await importRulesFile(options, 'not-json', 'bad.json')
  await expect(options.getByTestId('import-export-status')).toHaveCSS('font-size', '12px')
})

test('AC-3: extension on shows On, a signal track, and the thumb on the right', async ({ context, extensionId }) => {
  const popup = await openPopup(context, extensionId)
  await expectOnState(popup)
})

test('AC-4: turning the extension off shows Off and turning it on restores On', async ({ context, extensionId }) => {
  const popup = await openPopup(context, extensionId)
  const toggle = popup.getByTestId('global-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Enable extension')

  const state = popup.getByTestId('extension-state')
  await expect(state).toHaveText('Off')
  await expect(state).toHaveCSS('color', INK)
  await expect(toggle).toHaveCSS('background-color', IDLE)
  await expect.poll(() => thumbSide(toggle)).toBe('left')
  const disabled = popup.getByTestId('extension-disabled')
  await expect(disabled).toBeVisible()
  await expect(disabled).toHaveText('(extension disabled)')
  await expect(disabled).toHaveCSS('color', INK)
  await expect(disabled).toHaveCSS('font-size', '12px')
  await expect(disabled).toHaveCSS('font-weight', '600')

  await toggle.click()
  await expectOnState(popup)
})

test('AC-5: the active count is its own 12px ink line', async ({ context, extensionId }) => {
  const emptyPopup = await openPopup(context, extensionId)
  const emptyCount = emptyPopup.getByText('0 of 0 rules active', { exact: true })
  await expect(emptyCount).toBeVisible()
  await expect(emptyCount).toHaveCSS('color', INK)
  await expect(emptyCount).toHaveCSS('font-size', '12px')
  await expect(emptyCount).toHaveCSS('font-weight', '600')

  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const popup = await openPopup(context, extensionId)
  const one = popup.getByText('1 of 1 rule active', { exact: true })
  await expect(one).toBeVisible()
  await expect(one).toHaveCSS('color', INK)
  await expect(one).toHaveCSS('font-size', '12px')
  await expect(one).toHaveCSS('font-weight', '600')

  await popup.getByTestId('global-toggle').click()
  await expect(popup.getByTestId('extension-disabled')).toBeVisible()
  await expect(popup.getByText('1 of 1 rule active', { exact: true })).toBeVisible()
  await popup.getByTestId('global-toggle').click()
  await expect(popup.getByTestId('global-toggle')).toHaveAttribute('title', 'Disable extension')

  await popupRule(popup, usersRule.name).getByTestId('popup-rule-toggle').click()
  const none = popup.getByText('0 of 1 rule active', { exact: true })
  await expect(none).toBeVisible()
  await expect(none).toHaveCSS('color', INK)
  await expect(none).toHaveCSS('font-size', '12px')
  await expect(none).toHaveCSS('font-weight', '600')
})

test('AC-6: popup rows show live, disabled, and extension-off chrome', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const popup = await openPopup(context, extensionId)
  const row = popupRule(popup, usersRule.name)
  const toggle = row.getByTestId('popup-rule-toggle')

  await expect(row).toContainText(usersRule.name)
  await expect(row).toContainText(usersRule.urlPattern)
  await expect(row.getByText(usersRule.name, { exact: true })).toHaveCSS('color', INK)
  await expectLeftBar(row, SIGNAL)
  await expect(row.getByTestId('rule-power')).toHaveText('On')
  await expect(row.getByTestId('rule-power')).toHaveCSS('color', SIGNAL)
  await expect(toggle).toHaveCSS('background-color', SIGNAL)
  await expect(toggle).toHaveAccessibleName(/^Disable Users$/)
  await expect.poll(() => thumbSide(toggle)).toBe('right')

  await toggle.click()
  await expect(row.getByTestId('rule-power')).toHaveText('Off')
  await expect(row.getByText(usersRule.name, { exact: true })).toHaveCSS('color', SECONDARY)
  await expectLeftBar(row, LINE)
  await expect(toggle).toHaveCSS('background-color', IDLE)
  await expect(toggle).toHaveAccessibleName(/^Enable Users$/)
  await expect.poll(() => thumbSide(toggle)).toBe('left')

  await toggle.click()
  await expect(toggle).toHaveAccessibleName(/^Disable Users$/)
  await popup.getByTestId('global-toggle').click()
  await expect(popup.getByTestId('extension-disabled')).toBeVisible()
  await expect(row.getByText(usersRule.name, { exact: true })).toHaveCSS('color', SECONDARY)
  await expectLeftBar(row, LINE)
  const power = row.getByTestId('rule-power')
  await expect(power).toHaveText('On')
  await expect(power).toHaveCSS('color', SECONDARY)
  await expect(toggle).toHaveCSS('background-color', IDLE)
  await expect.poll(() => thumbSide(toggle)).toBe('right')
  await expect(toggle).toHaveAccessibleName(/^Disable Users$/)
})

test('AC-7: an empty popup offers a primary Open settings button', async ({ context, extensionId }) => {
  const popup = await openPopup(context, extensionId)
  await expect(popup.getByText('No rules yet.')).toBeVisible()
  await expect(popup.getByText('Open settings to add one.')).toBeVisible()
  const openSettings = popup.getByTestId('open-settings')
  await expect(openSettings).toHaveText('Open settings')
  await expect(openSettings).toHaveRole('button')
  await expectPrimary(openSettings)
  const list = popup.getByTestId('popup-rule-list')
  await expect(list).toHaveCSS('max-height', '256px')

  const opened = context.waitForEvent('page')
  await openSettings.click()
  const options = await opened
  await expect(options.getByRole('heading', { name: 'API Response Simulator' })).toBeVisible()
})

test('AC-8: tabbing the popup shows the ink focus outline', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const popup = await openPopup(context, extensionId)
  const openSettings = popup.getByTestId('open-settings')
  await expectPrimary(openSettings)
  await expectTabbedInkFocus(popup, popup.getByTestId('global-toggle'))
  await expectTabbedInkFocus(popup, popupRule(popup, usersRule.name).getByTestId('popup-rule-toggle'))
  await expectTabbedInkFocus(popup, openSettings)
})

test('AC-9: Add rule is primary, import and export are secondary, and the form hides them', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const addRule = options.getByTestId('add-rule')
  const importRules = options.getByTestId('import-rules')
  const exportRules = options.getByTestId('export-rules')
  await expectPrimary(addRule)
  await expectSecondary(importRules)
  await expectSecondary(exportRules)

  await addRule.hover()
  await expect(addRule).toHaveCSS('background-color', SIGNAL_PRESS)
  await expect(addRule).toHaveCSS('color', WHITE)

  await addRule.click()
  await expect(options.getByRole('heading', { name: 'New rule' })).toBeVisible()
  await expect(addRule).toBeHidden()
  await expect(importRules).toBeHidden()
  await expect(exportRules).toBeHidden()
  await options.getByTestId('cancel-rule').click()
  await expect(addRule).toBeVisible()
  await expect(importRules).toBeVisible()
  await expect(exportRules).toBeVisible()
})

test('AC-10: the empty options state and a single column of cards', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await expect(options.getByText('No rules yet. Add your first rule.', { exact: true })).toBeVisible()
  await expect(options.getByText('Click "Add rule" above to get started.', { exact: true })).toBeVisible()
  const exportRules = options.getByTestId('export-rules')
  await expect(exportRules).toBeDisabled()
  await expect(exportRules).toHaveCSS('color', SECONDARY)
  await expect(exportRules).toHaveCSS('opacity', '1')
  await expectSolidBorder(exportRules, LINE)

  await createRule(options, {
    name: 'Alpha',
    urlPattern: '127.0.0.1:4173/api/alpha',
    method: 'GET',
    statusCode: '200',
    responseBody: '{}',
    delayMs: '0',
  })
  await createRule(options, {
    name: 'Beta',
    urlPattern: '127.0.0.1:4173/api/beta',
    method: 'POST',
    statusCode: '201',
    responseBody: '{}',
    delayMs: '0',
  })
  const first = await ruleCard(options, 'Alpha').boundingBox()
  const second = await ruleCard(options, 'Beta').boundingBox()
  expect(first).toBeTruthy()
  expect(second).toBeTruthy()
  expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeLessThan(1)
  expect(second?.y ?? 0).toBeGreaterThan(first?.y ?? 0)
})

test('AC-11: rule cards use method colors, power, and button styles', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await expect(options.getByTestId('add-rule')).toHaveCSS('border-radius', /^(2px|2px 2px 2px 2px)$/)

  for (const entry of methodCards) {
    await createRule(options, {
      name: entry.name,
      urlPattern: `127.0.0.1:4173/api/${entry.method.toLowerCase()}`,
      method: entry.method,
      statusCode: entry.status,
      responseBody: '{}',
      delayMs: '0',
    })
    const card = ruleCard(options, entry.name)
    const method = card.getByText(entry.method, { exact: true })
    const status = card.getByText(entry.status, { exact: true })
    await expect(method).toHaveCSS('color', entry.color)
    await expect(method).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(status).toHaveCSS('color', INK)
    await expect(status).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(card).toHaveCSS('box-shadow', 'none')
    await expect(card).toHaveCSS('border-radius', /^(0px|0px 0px 0px 0px)$/)
    await expect(card).toHaveCSS('opacity', '1')
  }

  const enabled = ruleCard(options, 'Get users')
  await expect(enabled.getByText('Get users', { exact: true })).toHaveCSS('color', INK)
  await expect(enabled.getByTestId('rule-power')).toHaveText('On')
  await expect(enabled.getByTestId('rule-power')).toHaveCSS('color', SIGNAL)
  await expect(enabled.getByTestId('rule-enabled-toggle')).toHaveCSS('background-color', SIGNAL)
  await expect(enabled.getByTestId('rule-enabled-toggle')).toHaveAccessibleName(/^Disable Get users$/)
  await expectLeftBar(enabled, SIGNAL)
  await expect.poll(() => thumbSide(enabled.getByTestId('rule-enabled-toggle'))).toBe('right')
  await expectSecondary(enabled.getByTestId('rule-edit'))
  const remove = enabled.getByTestId('rule-delete')
  await expect(remove).toHaveCSS('color', DANGER)
  await expect(remove).toHaveCSS('background-color', WHITE)
  await expectSolidBorder(remove, DANGER)

  const disabled = ruleCard(options, 'Post users')
  await disabled.getByTestId('rule-enabled-toggle').click()
  await expect(disabled.getByText('Post users', { exact: true })).toHaveCSS('color', SECONDARY)
  await expect(disabled.getByTestId('rule-power')).toHaveText('Off')
  await expect(disabled.getByTestId('rule-power')).toHaveCSS('color', INK)
  await expect(disabled.getByTestId('rule-enabled-toggle')).toHaveCSS('background-color', IDLE)
  await expect(disabled.getByTestId('rule-enabled-toggle')).toHaveAccessibleName(/^Enable Post users$/)
  await expectLeftBar(disabled, LINE)
  await expect.poll(() => thumbSide(disabled.getByTestId('rule-enabled-toggle'))).toBe('left')
  await expect(disabled.getByText('POST', { exact: true })).toHaveCSS('color', 'rgb(29, 78, 137)')
  await expect(disabled.getByText('POST', { exact: true })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(disabled.getByText('201', { exact: true })).toHaveCSS('color', INK)
  await expect(disabled.getByText('201', { exact: true })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(disabled).toHaveCSS('opacity', '1')

  const popup = await openPopup(context, extensionId)
  await popup.getByTestId('global-toggle').click()
  await expect(popup.getByTestId('extension-disabled')).toBeVisible()
  await options.reload()
  await expect(options.getByRole('heading', { name: 'API Response Simulator' })).toBeVisible()
  const stillOn = ruleCard(options, 'Get users')
  await expect(stillOn.getByTestId('rule-power')).toHaveText('On')
  await expect(stillOn.getByTestId('rule-power')).toHaveCSS('color', SIGNAL)
  await expect(stillOn.getByTestId('rule-enabled-toggle')).toHaveCSS('background-color', SIGNAL)
  await expectLeftBar(stillOn, SIGNAL)
})

test('AC-12: delete confirms inline without a browser dialog', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const dialogs: string[] = []
  options.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss()
  })

  const card = ruleCard(options, usersRule.name)
  await card.getByTestId('rule-delete').click()
  await expect(card.getByText('Are you sure?', { exact: true })).toBeVisible()
  await expect(card.getByTestId('rule-delete-confirm')).toBeVisible()
  await expect(card.getByTestId('rule-delete-cancel')).toBeVisible()
  expect(dialogs).toEqual([])
  await expect(card.getByTestId('rule-delete-confirm')).toHaveCSS('background-color', DANGER)
  await expect(card.getByTestId('rule-delete-confirm')).toHaveCSS('color', WHITE)
  await expectSecondary(card.getByTestId('rule-delete-cancel'))

  await card.getByTestId('rule-delete-cancel').click()
  await expect(card).toBeVisible()
  await expect(card.getByTestId('rule-delete')).toBeVisible()
  await expect(card.getByTestId('rule-delete-confirm')).toHaveCount(0)
  expect(dialogs).toEqual([])

  await card.getByTestId('rule-delete').click()
  await card.getByTestId('rule-delete-confirm').click()
  await expect(card).toHaveCount(0)
  expect(dialogs).toEqual([])
})

test('AC-13: the rule form exposes its fields and the ink focus outline', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await options.getByTestId('add-rule').click()
  await expect(options.getByRole('heading', { name: 'New rule' })).toBeVisible()
  await expectPrimary(options.getByTestId('save-rule'))
  await expectSecondary(options.getByTestId('cancel-rule'))
  await expect(options.getByTestId('add-header')).toHaveText('+ Add header')
  await expectSecondary(options.getByTestId('add-header'))
  await expect(options.getByText('No custom headers. Content-Type: application/json is always added. Example: x-debug: true.', { exact: true })).toBeVisible()

  for (const name of ['Name', 'URL pattern', 'Method', 'Status code', 'Response body', 'Delay (ms)']) {
    await expect(namedField(options, name)).toBeVisible()
  }

  await options.getByTestId('add-header').click()
  const header = options.getByTestId('header-row').last()
  await expect(header.getByRole('textbox', { name: 'Header name', exact: true })).toBeVisible()
  await expect(header.getByRole('textbox', { name: 'Header value', exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Remove header', exact: true })).toBeVisible()

  await expectTabbedInkFocus(options, namedField(options, 'Name'))
  await expectTabbedInkFocus(options, namedField(options, 'Method'))
  await expectTabbedInkFocus(options, options.getByTestId('save-rule'))
})

test('AC-14: import and export status use signal and danger', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const downloadPromise = options.waitForEvent('download')
  await options.getByTestId('export-rules').click()
  await downloadPromise
  const status = options.getByTestId('import-export-status')
  await expect(status).toHaveText('Exported 1 rule.')
  await expect(status).toHaveCSS('color', SIGNAL)

  await importRulesFile(options, 'not-json', 'bad.json')
  await expect(status).toHaveText('File is not valid JSON.')
  await expect(status).toHaveCSS('color', DANGER)

  await importRulesFile(
    options,
    '{"version":1,"rules":[{"name":"Ok","urlPattern":"127.0.0.1:4173/api/users","method":"GET","statusCode":200,"responseBody":"{}"}]}',
    'ok.json',
  )
  await expect(ruleCard(options, 'Ok')).toBeVisible()
  await expect(status).toHaveCSS('color', SIGNAL)

  await importRulesFile(
    options,
    '{"version":1,"rules":[{"name":"Mixed","urlPattern":"127.0.0.1:4173/api/mixed","method":"GET","statusCode":200},{"name":""}]}',
    'mixed.json',
  )
  await expect(status).toHaveText('Imported 1 rule (skipped 1 invalid).')
})

test('AC-15: tabbing the options page shows the ink focus outline', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const card = ruleCard(options, usersRule.name)
  await expectTabbedInkFocus(options, options.getByTestId('add-rule'))
  await expectTabbedInkFocus(options, options.getByTestId('import-rules'))
  await expectTabbedInkFocus(options, options.getByTestId('export-rules'))
  await expectTabbedInkFocus(options, card.getByTestId('rule-enabled-toggle'))
  await expectTabbedInkFocus(options, card.getByTestId('rule-edit'))
  await expectTabbedInkFocus(options, card.getByTestId('rule-delete'))
})

test('AC-16: the switch thumb transition is at most 150ms and reduced motion is instant', async ({ context, extensionId }) => {
  const popup = await openPopup(context, extensionId)
  await popup.emulateMedia({ reducedMotion: 'no-preference' })
  await popup.reload()
  await expect(popup.getByText('API Response Simulator')).toBeVisible()
  const toggle = popup.getByTestId('global-toggle')
  await expect(toggle).toBeVisible()
  await expect.poll(async () => {
    const ms = await thumbMotionMs(toggle)
    return ms > 0 && ms <= 150 ? 'ok' : `duration:${ms}`
  }).toBe('ok')

  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  await expectNoEntrance(ruleCard(options, usersRule.name))
  const rowPopup = await openPopup(context, extensionId)
  await expectNoEntrance(popupRule(rowPopup, usersRule.name))

  await popup.emulateMedia({ reducedMotion: 'reduce' })
  await popup.reload()
  await expect(popup.getByText('API Response Simulator')).toBeVisible()
  await expect.poll(() => thumbMotionMs(popup.getByTestId('global-toggle'))).toBe(0)
})

test('AC-17: toolbar icons, badge, and tooltip', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  expect(await iconPixel(options, 'icons/icon-16.png', 0, 0)).toBe('16:000000')
  expect(await iconPixel(options, 'icons/icon-16.png', 2, 2)).toBe('16:4338C9')
  expect(await iconPixel(options, 'icons/icon-48.png', 4, 8)).toBe('48:4338CA')
  expect(await iconPixel(options, 'icons/icon-128.png', 64, 64)).toBe('128:4338CA')
  expect(await iconPixel(options, 'icons/icon-16-off.png', 2, 2)).toBe('16:6B7280')

  const workerSource = await options.evaluate(async () => {
    const chromeApi = (globalThis as unknown as {
      chrome: { runtime: { getURL: (path: string) => string } }
    }).chrome
    const manifest = await (await fetch(chromeApi.runtime.getURL('manifest.json'))).json() as {
      background?: { service_worker?: string }
    }
    const workerPath = manifest.background?.service_worker
    if (!workerPath) return ''
    return fetch(chromeApi.runtime.getURL(workerPath)).then((response) => response.text())
  })
  const iconPaths = workerSource.match(/icons\/icon-\d+(?:-off)?\.png/g) ?? []
  expect(new Set(iconPaths)).toEqual(new Set([
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-16-off.png',
    'icons/icon-32-off.png',
  ]))

  const worker = extensionServiceWorker(context, extensionId)
  await expect.poll(async () => (await readExtensionState(worker)).badgeText).toBe('ON')
  await expect.poll(async () => (await readExtensionState(worker)).title).toBe('API Response Simulator: ON')
  await expect.poll(() => badgeRgb(worker)).toBe('19,115,51')

  const popup = await openPopup(context, extensionId)
  await popup.getByTestId('global-toggle').click()
  await expect(popup.getByTestId('extension-disabled')).toBeVisible()
  await expect.poll(async () => (await readExtensionState(worker)).badgeText).toBe('OFF')
  await expect.poll(async () => (await readExtensionState(worker)).title).toBe('API Response Simulator: OFF')
  await expect.poll(() => badgeRgb(worker)).toBe('95,99,104')
})

test('AC-18: saved rules stay in sync and export reports the count', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId)
  await createRule(options, usersRule)
  const card = ruleCard(options, usersRule.name)
  await expect(card).toContainText(usersRule.name)
  await expect(card).toContainText('GET')
  await expect(card).toContainText('201')
  await expect(card).toContainText(usersRule.urlPattern)

  await card.getByTestId('rule-edit').click()
  await expect(options.getByRole('heading', { name: 'Edit rule' })).toBeVisible()
  await options.getByTestId('rule-response-body').fill('{"source":"edited"}')
  await options.getByTestId('save-rule').click()
  await card.getByTestId('rule-edit').click()
  await expect(options.getByTestId('rule-response-body')).toHaveValue('{"source":"edited"}')
  await options.getByTestId('cancel-rule').click()

  await card.getByTestId('rule-enabled-toggle').click()
  await expect(card.getByTestId('rule-power')).toHaveText('Off')
  const popup = await openPopup(context, extensionId)
  await expect(popupRule(popup, usersRule.name).getByTestId('rule-power')).toHaveText('Off')

  await popupRule(popup, usersRule.name).getByTestId('popup-rule-toggle').click()
  await expect(popupRule(popup, usersRule.name).getByTestId('rule-power')).toHaveText('On')
  await popupRule(popup, usersRule.name).getByTestId('popup-rule-toggle').click()
  await expect(popupRule(popup, usersRule.name).getByTestId('rule-power')).toHaveText('Off')
  await expect(card.getByTestId('rule-power')).toHaveText('Off')

  const downloadPromise = options.waitForEvent('download')
  await options.getByTestId('export-rules').click()
  await downloadPromise
  await expect(options.getByTestId('import-export-status')).toHaveText('Exported 1 rule.')
})
