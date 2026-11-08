| Probe | Prompt | Expected | Triggered | Followed | Evidence | Fix |
|---|---|---|---|---|---|---|
| 1 | Write a Playwright test that toggles the extension OFF and checks the badge | `extension-e2e-testing` and `playwright-best-practices` | not observable | yes | After the click, `readExtensionState` is polled until `badgeText` is `OFF`. | none |
| 2 | Add a new permission X | the accepted MV3 skill | not observable | yes | A new permission needs a written least-privilege justification before it is added. | none |
| 3 | A background variable resets after a while | the accepted MV3 skill | not observable | yes | An in-memory or global variable does not survive that. | none |
| 4 | Restyle the popup | `frontend-design` | not observable | yes | The files are `src/popup/Popup.tsx`, `src/popup/popup.css`, and `src/popup/index.html`. | none |
| 5 | Prepare the store submission | `release-checklist` | not observable | yes | so `manifest.json` is at the archive root. | none |

## Playwright MCP

Decision: not installed. Tests-as-code (`npm test`, `e2e/extension.ts`) cover this pipeline. Risks are browser control and network access. A later install needs the human's approval first.

## Probe 1

The new test in `e2e/toolbar-badge.spec.ts` opens the popup, turns the extension off, and checks the toolbar badge through the service worker.

```1:22:e2e/toolbar-badge.spec.ts
import {
  expect,
  extensionServiceWorker,
  openExtensionPage,
  readExtensionState,
  test,
} from './extension'

test('global off sets the toolbar badge to OFF', async ({ context, extensionId }) => {
  const popup = await openExtensionPage(context, extensionId, 'popup')
  const toggle = popup.getByTestId('global-toggle')
  await expect(toggle).toHaveAttribute('title', 'Disable extension')

  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Enable extension')
  await expect(popup.getByTestId('extension-disabled')).toBeVisible()

  await expect.poll(async () => {
    const state = await readExtensionState(extensionServiceWorker(context, extensionId))
    return state.badgeText
  }).toBe('OFF')
})
```

The popup switch starts with the title `Disable extension`. After the click, `readExtensionState` is polled until `badgeText` is `OFF`. The badge is painted from storage after the click, so `await expect.poll` retries that read instead of sampling it once.

`npx playwright test e2e/toolbar-badge.spec.ts` passed: 1 passed (2.4s).

Not verified: lint, typecheck, and the rest of the Playwright suite.

## Probe 2

A new permission needs a written least-privilege justification before it is added. The manifest is unchanged.

`public/manifest.json` already has permission `storage` and host permissions `<all_urls>`, `http://localhost/*`, and `https://localhost/*`. `declarativeNetRequest` stays forbidden. The reason is in `AGENTS.md`, which also wins over `.cursor/rules/project-core.mdc` when they differ.

Send the Chrome API name and the least-privilege reason it is required. This chat has no role yet. After that justification is written, say which role should continue: `@role-spec`, `@role-qa`, `@role-dev`, or `@role-tester`.

**Not verified:** no files were edited, and lint, typecheck, build, and tests were not run.

## Probe 3

The background variable resets because Chrome stops, kills, or restarts the Manifest V3 service worker after it sits idle for about 30 seconds. An in-memory or global variable does not survive that.

In `src/background/service-worker.ts` the only global is `toolbarPaintGeneration`. When the worker starts again, that counter is created anew at `0`. It only exists so a slower storage read cannot paint over a newer one during a single worker lifetime, so losing it is expected.

The toolbar ON/OFF state is not that variable. It lives in `chrome.storage` (`chrome.storage.local`, key `settings`). Each time the worker script loads, `paintToolbarFromStorage()` reads `settings` and paints the badge again, and the same read runs on install and on browser startup. Popup and options go through `getSettings` and `saveSettings` in `src/shared/storage.ts`, which write that same storage.

Keep any value that must last across a restart in `chrome.storage`. A generation counter can stay in memory. Listeners that must run after a restart stay at the top level of the service worker, as they already do.

I did not idle the service worker in Chrome to watch the restart.

## Probe 4

## Plan

The popup is the faceplate of a small interceptor. The files are `src/popup/Popup.tsx`, `src/popup/popup.css`, and `src/popup/index.html`. The lamp is the only strong color. Everything else stays quiet, left aligned, and on a 320px width.

1. **Color.** Faceplate `#E6EBF0`, recess `#F4F7F9`, ink `#1B2836`, seam `#C5D0DA`, filament `#C47B09`, path `#4A5C6E`.
2. **Type.** One family, Bahnschrift, with Segoe UI and sans-serif behind it. The product name is 15px semibold. Rule names are 13px semibold. Counts and URL patterns are 12px.
3. **Layout.** Left aligned. The lamp and the product name share the top strip. The count sits on the faceplate. Rules sit in a recessed well, one seam between rows. The settings action is a text button on the faceplate.

```
┌──────────────────────────────┐
│ ( ● )  API Response Simulator│
│ 1 of 2 rules active          │
│┌────────────────────────────┐│
││ Users                  [on]││
││ localhost:8080/api/*       ││
│├────────────────────────────┤│
││ Orders                [off]││
│└────────────────────────────┘│
│ Open settings                │
└──────────────────────────────┘
```

4. **Principles.** The amber lamp means the extension is intercepting. Seams separate the strip, the count, the well, and the footer. Rule switches use ink when on. Existing words stay: the product name, the active count, `(extension disabled)`, the empty-state sentence, and Open settings.

The first sketch was a dark slate panel. That is the usual developer-tool panel, so the faceplate is cool aluminum and the amber stays on the lamp.

## What you see

`src/popup/Popup.tsx` keeps the same controls. The global switch is the lamp. Its title is still `Disable extension` or `Enable extension`, and both switches expose `aria-pressed` and an accessible name. Keyboard focus draws a 2px ink outline. The rule-switch motion is removed when the system asks for reduced motion.

```48:57:src/popup/Popup.tsx
        <button
          type="button"
          data-testid="global-toggle"
          onClick={handleGlobalToggle}
          className={settings.extensionEnabled ? 'lamp is-on' : 'lamp'}
          aria-pressed={settings.extensionEnabled}
          aria-label={extensionLabel}
          title={extensionLabel}
        >
          <span className="lamp-filament" />
```

Lint and typecheck passed. The popup build is in `dist/`. In Chromium, the on, off, and empty states read correctly, and a keyboard focus ring computed as `2px solid rgb(27, 40, 54)`. Smoke, intercept, persistence, and edge tests passed: 15 tests.

I did not run the rules, import-export, or ai-readiness Playwright files. I did not open the popup from the real toolbar icon, and I did not check the options page visually. The options stylesheet is a separate file, and its smoke test passed.

## Probe 5

The store package is ready for your review at version **1.0.0**. `package.json` and `public/manifest.json` stay at `1.0.0`.

The ZIP is `api-response-simulator-1.0.0.zip` in the repo root (73 KB, 13 files). It is the contents of `dist/` after `npm run build`, so `manifest.json` is at the archive root. The listing name is **API Response Simulator**.

**Privacy text** (review this before you submit):

API Response Simulator keeps mock rules and the on/off setting in `chrome.storage.local` on this browser, using the `storage` permission. Host access is `<all_urls>`, `http://localhost/*`, and `https://localhost/*`, so a matching page request can receive a fake response in that tab. The extension loads only the scripts in this package (no remote code). There is no account. Rules and settings stay on the device.

**GitHub release** (not created): tag `1.0.0`, the same as the version, with this same ZIP attached. There is no publishing automation. No store API was called.

Not verified: lint, typecheck, Playwright, loading this ZIP in Chrome, store screenshots, or a public privacy-policy URL.
