# 002 — Show ON/OFF status in the browser toolbar

GitHub issue: https://github.com/SlobodanBogdanovic/APIResponseSimulator/issues/3

## Who is the user and what problem do they have

The user is a developer or QA person using **API Response Simulator** while their app calls an API. They turn mocking on or off with the switch in the popup header, then go back to the app.

That switch is easy to forget. The toolbar button looks the same either way. To learn whether matching requests will be mocked, they have to open the popup and look at the switch, or notice the “(extension disabled)” line. When a response is mocked, or hits the real server, and they did not expect it, they cannot tell the reason from the toolbar.

## Problem

The toolbar button shows no ON/OFF state. There is no badge text, no badge color, and no status tooltip.

The product already has one global switch, `settings.extensionEnabled`, saved in `chrome.storage.local`. The popup header writes it. The interceptor mocks matching requests only while that flag is truthy. Nothing paints that flag on the browser toolbar.

Opening the popup is the only way to see the switch. The service worker does not set a badge on install, on browser startup, or when `settings` changes. Badge text does not survive a browser restart on its own, and this extension never sets it.

## Expected user outcome

The user looks at the extension’s toolbar button and reads the mocking switch.

When the switch is on, the button shows a badge with the letters ON on a dark green background, and hovering the button shows the tooltip `API Response Simulator: ON`.

When the switch is off, the badge shows the letters OFF on a dark gray background, and the tooltip is `API Response Simulator: OFF`.

The letters are the status. The colors repeat the same status. White badge text stays readable on a light toolbar and on a dark toolbar.

The user flips the switch in the popup, closes the popup, and sees the new badge and tooltip within one second. They do not open the popup a second time to refresh the toolbar. Every window shows the same badge and the same tooltip.

After a browser restart, an install, an update, a reload from `chrome://extensions`, or a service worker restart, the badge and tooltip still match the saved switch. A first install, with nothing saved yet, shows ON.

The indigo toolbar icon stays the icon the extension already ships. ON and OFF use that same icon. The badge and the tooltip carry the status.

## User story

As a developer or QA person using the extension, I want to see ON or OFF on the toolbar button, so I always know whether my requests are being mocked.

## Scope

One PR. Toolbar badge, badge colors, and tooltip for the existing global switch.

When a `settings` object is present, the toolbar uses the same truthiness rule as the popup header switch and the interceptor: a truthy `extensionEnabled` is on, and a falsy `extensionEnabled` is off. Falsy includes `false`, a missing field, `null`, `0`, and `""`. A truthy non-boolean is on, because the popup and the interceptor already treat it as on. An absent `settings` key and a failed read paint ON, the first-install default. A failed read does not write that default. This is the extension’s own mocking switch. It is independent of Chrome’s enable/disable for the extension, and independent of each rule’s `enabled` flag.

The saved value lives in `chrome.storage.local` under the key `settings`, field `extensionEnabled`. The service worker reads that stored value whenever it paints the toolbar. A variable that exists only in service-worker memory is not the source of truth. Manifest V3 workers stop and start again; the paint path reads storage (or the `settings` change payload, which is the stored value) on every run.

### What the user sees

| Resolved case | Badge text | Badge background | Badge text color | Tooltip |
|---|---|---|---|---|
| Truthy `extensionEnabled`, an absent `settings` key, or a failed read | `ON` | `#137333` | `#FFFFFF` | `API Response Simulator: ON` |
| A present `settings` object whose `extensionEnabled` is falsy (`false`, a missing field, `null`, `0`, or `""`) | `OFF` | `#5F6368` | `#FFFFFF` | `API Response Simulator: OFF` |

- Badge text is exactly `ON` or `OFF`: uppercase, no extra spaces, and not an empty badge.
- Tooltip text is exactly the two strings in the table, including the spaces and the colon. The product name is **API Response Simulator**, the same name as `manifest.json`.
- Both backgrounds are opaque. White on `#137333` is 5.95:1. White on `#5F6368` is 6.05:1. Both are above 4.5:1.
- `#137333` is the dark green. `#5F6368` is the dark gray.
- `chrome.action` calls omit `tabId`, so every window and every tab share one badge and one tooltip.

### One toolbar function

One function in the service worker is the only code that paints this status. It takes the on/off boolean resolved by the rules below and, from that same boolean, sets all of the following:

- badge text (`chrome.action.setBadgeText`)
- badge background (`chrome.action.setBadgeBackgroundColor`)
- badge text color (`chrome.action.setBadgeTextColor`) to `#FFFFFF` for both states
- tooltip (`chrome.action.setTitle`)
- toolbar icon (`chrome.action.setIcon`) to the existing files `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png`

Those icon paths are the same for ON and for OFF. The function does not choose a second image. No other function calls those five action APIs.

`setBadgeTextColor` is part of `chrome.action` in Chrome 110 and later. This extension’s minimum is Chrome 111. A narrow local type for that call, in the service worker file, is enough if the checked-in Chrome types omit it. That local type is not a new dependency.

### When the function runs

The service worker calls that function:

- once at worker startup, after the listeners below are registered, so a worker restart repaints from storage
- from `chrome.runtime.onInstalled` (install and update, including a reload from `chrome://extensions`)
- from `chrome.runtime.onStartup` (browser start)
- from `chrome.storage.onChanged` when the area is `local` and the changed key is `settings`

`onInstalled`, `onStartup`, `onChanged`, and the existing `onMessage` listener are registered synchronously at the top level of the service worker, before any `await`. The existing `OPEN_OPTIONS` behavior stays.

On a `settings` change, the function paints that change using the resolution rules below. A change whose new value is missing is an absent `settings` key and paints ON. A slower earlier read does not paint over a newer value. The last stored boolean is the one on the toolbar after a burst of toggles.

A change to the `rules` key does not repaint the toolbar.

The install path still writes `{ extensionEnabled: true }` only when `settings` is absent. An update, a reload, or a worker restart leaves a stored `true` or `false` in place.

### Reading storage

The toolbar read checks `chrome.runtime.lastError` and catches a thrown read error. A failed read does not surface an unhandled exception.

Resolution rules:

- ON when `extensionEnabled` is truthy, when the `settings` key is absent, or when the read fails. A truthy non-boolean is ON, because the popup and the interceptor already treat it as on. Absent includes a key that was never stored and a key deleted later.
- OFF, with the OFF colors and the tooltip `API Response Simulator: OFF`, when a `settings` object is present and `extensionEnabled` is falsy, including `false`, a missing field, `null`, `0`, and `""`.

The interceptor, the bridge, and the popup stay unchanged.

### Files to change

- `src/background/service-worker.ts`
- `dist/` only as the output of the existing `npm run build` (the loadable worker is `dist/background/service-worker.js`)

### Files that stay unchanged

These paths are not permission to edit:

- `src/content/interceptor.ts`
- `src/content/bridge.ts`
- `src/popup/**`
- `src/options/**`
- `src/shared/types.ts`
- `src/shared/storage.ts`
- `public/manifest.json`
- `package.json` and `package-lock.json`
- `e2e/**`
- `scripts/gen-icons.mjs`
- `public/icons/**`

The popup header switch already calls `saveSettings`. The service worker hears that write through `chrome.storage.onChanged`. The popup does not paint the badge.

Names that stay: `MockRule`, storage keys `rules` and `settings`, field `extensionEnabled`, bridge message source `__ninja_interceptor_bridge__`.

## Out of scope

- Per-tab or per-window status.
- Notifications.
- A new icon, a grayed icon, or any redesign of the indigo icon artwork.
- A new setting, a new options-page control, or a keyboard shortcut. The options page has no global switch today. The manifest has no `commands` entry. This spec leaves both as they are.
- Changing what the popup switch does, or its “Enable extension” / “Disable extension” button title, or the “(extension disabled)” line.
- Treating “any rule is enabled” or “a request is in flight” as the toolbar status. The toolbar follows `extensionEnabled` only. With the switch on and zero matching rules, the badge stays ON and unmatched requests still reach the network.
- Changing interceptor or bridge behavior, including how a malformed `settings` object affects mocking.
- `declarativeNetRequest`, new permissions, or new dependencies.
- New Playwright tests, or edits to the existing smoke tests.
- Setting `action.default_title` in the manifest to an ON or OFF sentence. The worker sets the tooltip from storage so a saved OFF does not sit under a manifest title that says ON.

## Acceptance criteria

1. Given `settings.extensionEnabled` is true, when the user looks at the toolbar button in any window, then the badge text is `ON`, the badge background is `#137333`, the badge text color is `#FFFFFF`, and the tooltip is exactly `API Response Simulator: ON`. Every window shows that same badge and tooltip.
2. Given `settings.extensionEnabled` is false, when the user looks at the toolbar button in any window, then the badge text is `OFF`, the badge background is `#5F6368`, the badge text color is `#FFFFFF`, and the tooltip is exactly `API Response Simulator: OFF`. Every window shows that same badge and tooltip.
3. Given the user toggles the popup header switch, when one second has passed, then the badge and tooltip match the new stored value after the popup is closed, without opening the popup again to refresh them. Given several toggles in a row, when one second has passed after the last toggle, then the badge and tooltip match the last stored value. Given the user toggles a single rule’s `enabled` flag on the popup or the options page, when they look at the toolbar, then the badge and tooltip stay on the current `extensionEnabled` value.
4. Given a browser restart, an extension install, an extension update, a reload from `chrome://extensions`, or a service worker restart, when the service worker has started, then the badge and tooltip match the stored switch, and the user does not open the popup to make them match. Given a first install with no stored `settings`, when the worker has started, then the badge and tooltip show the default ON state from criterion 1. Given a stored `false`, when any of those restarts finish, then the badge and tooltip stay on the OFF state from criterion 2.
5. Given a light toolbar and a dark toolbar, when the user reads the badge, then the status is the words `ON` and `OFF`. The badge text is `#FFFFFF` on an opaque `#137333` (ON, 5.95:1) or an opaque `#5F6368` (OFF, 6.05:1).
6. Given a reader inspects the source, when they find updates to the toolbar badge, tooltip, or icon, then one service-worker function is the only caller of `chrome.action.setBadgeText`, `setBadgeBackgroundColor`, `setBadgeTextColor`, `setTitle`, and `setIcon`. That function sets all five from the same resolved boolean. `setIcon` receives `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png` for both booleans. The worker calls this function at worker startup, on install, on browser startup, and on every local `settings` storage change. Those listeners are registered at the top level of the service worker before any `await`.
7. Given the storage read fails with `chrome.runtime.lastError` or a thrown error, when the worker paints the toolbar, then it shows the default ON badge and tooltip from criterion 1 and does not produce an unhandled exception. Given the read succeeds with `extensionEnabled === false`, when the worker paints the toolbar, then it shows OFF.
8. Given this work is complete, when the reader checks the manifest, the package file, and the test run, then the permissions are still `storage` plus the existing `host_permissions`, `package.json` has no new dependency, and `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` pass. The existing Playwright smoke tests stay as they are.
9. Given a present `settings` object whose `extensionEnabled` is missing or `false`, when the user looks at the toolbar and opens the popup, then the badge is the OFF state from criterion 2, the popup switch is in the off position, and the popup shows “(extension disabled).” Given a truthy `extensionEnabled`, including a truthy non-boolean, when the user looks at the toolbar and opens the popup, then the badge is the ON state from criterion 1 and the popup switch is in the on position.

## Edge cases

- First run with no `settings` key. The badge and tooltip show ON. The install writer still stores `{ extensionEnabled: true }` only when the key is absent. The toolbar agrees with that default before and after the write.
- When `settings` is present, the toolbar uses the same truthiness rule as the popup switch and the interceptor (truthy → ON, falsy → OFF). Falsy includes `false`, a missing field, `null`, `0`, and `""`. A truthy non-boolean shows ON, because the popup and the interceptor already treat it as on. The interceptor, the bridge, and the popup stay unchanged.
- The `settings` key is deleted later. The toolbar returns to ON.
- The user toggles the popup switch several times quickly. The badge and tooltip end on the last stored boolean within one second of that last toggle. An earlier read does not cover a later one.
- Two or more browser windows are open. A toggle in one window’s popup updates the toolbar button in every window, because the paint calls omit `tabId`.
- The user reloads the extension from `chrome://extensions` while the stored switch is on. The badge shows ON. While the stored switch is off, the reload leaves the badge OFF. Reload does not write a new default over existing `settings`.
- The service worker is stopped and started again (idle shutdown, or a wake for `OPEN_OPTIONS` or a storage change). The new worker paints from storage. It does not reuse an in-memory flag as the only memory of the switch.
- The user turns individual rules on or off, imports rules, or edits a rule. The toolbar ON/OFF value stays put.
- The switch is on and every rule is disabled, or no rule matches the request. The badge stays ON.
- The switch is off and rules are enabled. The badge stays OFF, and the interceptor still lets those requests through, as it does today.
- Browser restart with a stored OFF value. The badge is OFF after the worker starts. The implementation sets the badge on startup rather than trusting a badge left from the previous session.
- Light toolbar theme and dark toolbar theme. The white letters sit on the opaque green or gray badge background in both themes.
- Storage read failure. The toolbar shows ON and the worker does not throw an unhandled exception. A later successful read of `false` shows OFF.

## Test notes

Manual check is the browser toolbar button, after the unpacked `dist/` build is reloaded at `chrome://extensions`. The badge is visible when the popup is closed. The tooltip is the hover text on that button.

The control is the header switch on the popup. The stored field is `settings.extensionEnabled`. The popup page is `popup`. The options page is `options`, used to flip a single rule’s `enabled` flag and confirm the toolbar letters stay put. No fixture page is required to judge the badge. A page that issues a matching request can confirm the existing mock behavior still follows the same switch; this spec does not change that behavior.

The existing Playwright smoke tests open the options page and the popup page and look for the product name. They do not open the toolbar badge. This spec adds no Playwright test. `npm test` is the existing suite, run after `npm run build`.

Light and dark toolbars are the browser’s light and dark appearance. Hex values `#137333`, `#5F6368`, and `#FFFFFF` are checked in the service worker source. The toolbar itself should look dark green with white ON, and dark gray with white OFF.

A reload from `chrome://extensions` is the short stand-in for an extension update and a worker restart. A full browser restart is the check that a saved OFF value is painted again without opening the popup.

## Assumptions

- The phrase “Toolbar ON-FFF status” means this ON/OFF toolbar-status idea (issue 3). “FFF” is taken as a typo for OFF.
- The issue’s tooltip name `APIResponseSimulator` is resolved to the repo’s user-facing name, **API Response Simulator**. The tooltip strings are `API Response Simulator: ON` and `API Response Simulator: OFF`.
- The state is global. Verified in code: one `ExtensionSettings` object under the storage key `settings`, one `extensionEnabled` boolean, one interceptor `settings` value. Nothing is stored per tab. This assumption stands.
- A colored or grayed toolbar icon is not in this repo. Verified: `scripts/gen-icons.mjs` writes one indigo icon (`0x4F46E5FF`) at 16, 48, and 128. The manifest has a single `action.default_icon`. No code calls `chrome.action.setIcon`. This spec does not add a second icon. The one toolbar function sets the existing icon paths for both states so the icon, the badge, and the tooltip have a single writer. A later colored-icon change belongs inside that same function.
- No new permissions and no new dependencies. Verified: `public/manifest.json` permissions are `storage` and the current `host_permissions`. `package.json` is unchanged by this spec. This assumption stands.
- The options page and a keyboard shortcut are not present. Verified: the options page toggles `MockRule.enabled` only. The popup header is the only writer of `extensionEnabled`. The manifest has no `commands` key. Criterion 3 is the popup switch, plus any later writer of the same stored boolean, which the `settings` listener already covers. This spec does not add an options switch or a shortcut.
- The default switch is on. Verified: the service worker stores `{ extensionEnabled: true }` when `settings` is missing; `getSettings`, the bridge, and the interceptor’s initial value use the same default. The first-run badge is ON. This assumption stands.
- ON means the global switch is on, so matching rules may mock. It does not mean a request is being mocked right now, and it does not mean at least one rule is enabled. Verified against `interceptor.ts`: requests pass through when the switch is off, and when the switch is on with no matching rule.
- When `settings` is present, the toolbar uses the same truthiness rule as the popup switch and the interceptor (truthy → ON, falsy → OFF). A truthy non-boolean shows ON, because the popup and the interceptor already treat it as on. The interceptor, the bridge, and the popup stay unchanged. The normal popup write is still a boolean.
- The service worker may keep using `chrome.storage.local` directly, which it already does for install defaults. `src/shared/storage.ts` stays unchanged. React pages keep using that module.
- `action.default_title` stays unset. Until the worker paints, Chrome can show the extension name as the tooltip. The worker then replaces it from storage. A manifest title fixed to ON or OFF would be wrong for the other stored value.
- No clarifying questions were asked. The points above close the gaps.

## QA review

Filled by QA before implementation. QA round 2 of 2. Round 1 verdict was NEEDS CHANGES. This review re-judges those five findings. No new findings.

**Verdict:** APPROVE

**Biggest risk:** The badge can already read OFF while a matching request that started earlier, including one waiting on a rule delay, still returns the fake response. The user story still says the person always knows whether requests are being mocked, so that leftover response looks like a wrong badge.

**Findings:**

1. [Med] resolved. A present `settings` object whose `extensionEnabled` is missing or falsy is now the OFF badge, the OFF colors, and the tooltip `API Response Simulator: OFF`. A truthy value, including a truthy non-boolean, is ON. An absent `settings` key, a key deleted later, and a failed read stay ON. That is the same split as the popup switch, the “(extension disabled)” line, and whether matching requests are mocked. The status table, the resolution rules, the deleted-key edge, the assumption, and criterion 9 all say this.

   Suggested rewrite: No further rewrite. Leave those passages as they are.

2. [Low] still open. The user story still says the person will always know whether their requests are being mocked. The out-of-scope list and the edge case for a switch that is on with no matching rule already say the badge is the global switch, and a request that matches no rule still reaches the network while the badge stays ON. A later reader can call that correct badge a failure. The round-1 rewrite of this story was not applied.

   Suggested rewrite: Replace the user story with: As a developer or QA person using the extension, I want to see ON or OFF on the toolbar button, so I know whether the global mocking switch is on without opening the popup. Replace the last sentence of “Who is the user and what problem do they have” with: They only learn the switch position by opening the popup and looking at the switch or the “(extension disabled)” line. Add to the expected outcome: ON means a matching rule may mock the request. With the switch on and no matching rule, the badge stays ON and the request still reaches the network.

3. [Low] still open. After a restart or a reload, the button can show no letters, and the tooltip can be only the extension name, until the status is painted. That look is easy to mistake for a third status. Criterion 4 still judges the result “when the service worker has started,” which is not a moment the person can see. The assumption that Chrome can show the extension name until the worker paints covers only the tooltip, and it is not in the expected outcome or in criterion 4. The round-1 rewrite was not applied.

   Suggested rewrite: In the expected outcome and in criterion 4, say the saved ON or OFF appears without opening the popup. Before that paint, no badge and a tooltip that is only the extension name are allowed, and that look is not a status. The person judges the result by looking at the toolbar after a restart or a reload.

4. [Low] still open. Criterion 3 still starts a one-second clock and also says the result is judged after the popup is closed. The open popup covers the toolbar button, so a check at one second while the popup is still open can fail an update that has already landed. The same gap is in the sentence about several toggles in a row. The round-1 rewrite was not applied.

   Suggested rewrite: Replace the toggle sentences in criterion 3 with: Given the user toggles the popup header switch and closes the popup, when one second has passed since the toggle, then the badge and tooltip match the new stored value. They do not open the popup again. Given several toggles in a row, when the user closes the popup and one second has passed since the last toggle, then the badge and tooltip match the last stored value. Judge the badge after the popup closes, because the open popup hides the button.

5. [Low] still open. The badge can already read OFF while a matching request that started earlier, including one waiting on a rule delay, still returns the fake response. The person will think the toolbar is wrong. No edge case says this. The round-1 rewrite was not applied.

   Suggested rewrite: Add this edge case: The user turns the switch off while a matching request is already in progress, including a rule with a delay. The badge shows OFF within one second of that toggle. That request can still return the fake response. Requests that start after the switch is off follow the off switch. Interceptor behavior stays as it is today.

**Not verified:** The unpacked extension was not loaded. The badge, the hover tooltip, a light toolbar, a dark toolbar, and a browser restart were not looked at. Whether the letters OFF stay readable on the toolbar icon was not checked. The contrast figures were checked again by calculation: white on `#137333` is 5.95:1 and white on `#5F6368` is 6.05:1. They were not measured on a screen. The popup switch, the “(extension disabled)” line, and whether matching requests are mocked were read for a missing or falsy flag and were not exercised in the browser. An in-flight request that keeps the fake response after the switch turns off was read the same way and was not exercised. Issue 3 was read again; its comment is still only “Work started.”

## Manual verification steps

Filled by role-tester after implementation. About five minutes, with the unpacked extension loaded from `dist/`. The badge is read with the popup closed. The tooltip is the hover text on the toolbar button.

1. At `chrome://extensions`, click Reload on this extension. Close the popup if it opened. Look at the toolbar button and hover it. — Expected: the badge reads `ON` in white letters on a dark green background, the tooltip is exactly `API Response Simulator: ON`, and the icon is still the indigo icon. The status is the word `ON`. White letters on that green badge are readable on a light toolbar and on a dark toolbar.
2. Open the popup, turn the header switch off, and close the popup. Within one second, look at the toolbar button and hover it. Open a second browser window and look at that window’s button. Then open the popup again. — Expected: both windows show `OFF` in white letters on a dark gray background, and the tooltip is exactly `API Response Simulator: OFF`. The popup header switch is off, and the popup shows “(extension disabled).” Close the popup. The badge stays `OFF`.
3. Open the popup and flip the header switch several times, ending on. Close the popup. Within one second of the last flip, look at the toolbar button and hover it. — Expected: the badge reads `ON` in white on dark green, and the tooltip is exactly `API Response Simulator: ON`, matching the last position of the switch.
4. Leave the header switch on. Open the options page and turn one rule’s own switch off or on. Return to the toolbar button. — Expected: the badge stays `ON` and the tooltip stays `API Response Simulator: ON`.
5. Turn the header switch off, close the popup, and click Reload on the extension at `chrome://extensions`. Leave the popup closed. Look at the toolbar button and hover it. Turn the switch on, reload the extension again, and look with the popup closed. — Expected: after the first reload the badge is `OFF` in white on dark gray and the tooltip is exactly `API Response Simulator: OFF`. After the second reload the badge is `ON` in white on dark green and the tooltip is exactly `API Response Simulator: ON`.

## Definition of done

- [ ] Spec accepted by the human
- [ ] A QA requirements review was completed; findings accepted or spec updated
- [ ] DEV implemented the spec without changing the acceptance criteria
- [ ] role-tester acceptance check completed; findings addressed by DEV
- [ ] Human ran the Manual verification steps
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` were run and the output is in the PR
- [ ] Human reviewed and merged the PR
- [ ] A row was added to `docs/agent-runs.csv`
