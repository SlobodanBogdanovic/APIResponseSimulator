# 003 — Improve Playwright test coverage

## Who is the user and what problem do they have

The user is the person who publishes **API Response Simulator** and the person who maintains this repo with the agent pipeline.

The extension replaces `fetch` and `XMLHttpRequest` responses in real browser tabs. After a release, a regression reaches people who installed the extension, and every fix goes through Chrome Web Store review. Today the only check that loads the extension is a two-test smoke file. Create, edit, delete, mocking, the global on/off switch, persistence, response headers, and import/export are left to a short manual pass.

The maintainer also wants the agent pipeline to grow tests with each feature: the tester writes them from the spec, sees them fail for the right reason, and only then does Dev implement. Dev does not quiet a failing test by editing it.

## Problem

`e2e/smoke.spec.ts` opens the options page and the popup and checks that the heading text **API Response Simulator** is visible. `npm test` is `playwright test`. It does not build. CI (`.github/workflows/ci.yml`, job `verify`) runs lint, typecheck, build, Playwright, and on failure uploads `playwright-report/` only. Config is `workers: 1`, `fullyParallel: false`, `retries: 0`, no `webServer`, and no flaky summary. The fixture in `e2e/extension.ts` already launches headless Playwright Chromium with `launchPersistentContext('', { channel: 'chromium', headless: true })` and `--load-extension`. The empty user-data-dir is a fresh temporary profile per context, and the extension id comes from the service worker URL. Nothing in that fixture opens a local app, reads `chrome.storage`, or reopens the same profile.

There is no `data-testid` in `src/`. Several controls have no accessible name. The popup global switch and the options rule switch only expose a `title`. Labels in the rule form are not tied to the inputs with `htmlFor`.

`role-tester` is an acceptance check. `.cursor/agents/role-tester.md`, `AGENTS.md`, `docs/agent-workflow.md`, and `.cursor/rules/project-core.mdc` say the tester does not write Playwright tests and may write only **Manual verification steps**. `.cursor/commands/feature.md` runs spec, then QA, then Dev, then tester.

## Expected user outcome

On a checkout with dependencies installed, the maintainer runs `npm run test:e2e`. That builds `dist/` and runs the suite headless. The suite covers the behaviors listed in this spec. A pull request runs the same suite. A failed test fails the workflow and uploads the HTML report, traces, and screenshots. A test that fails once and then passes on the single CI retry is named in the GitHub Actions job summary.

The popup and options pages gain stable `data-testid` attributes. The extension's mocking behavior stays as it is today.

After this change is merged, the next feature goes through `/feature` in this order: spec, QA, tester writes failing tests from that spec, Dev makes them pass without editing those tests, tester runs the full suite and writes the remaining manual steps. If the tester believes a test is wrong, the pipeline stops and asks the human. Two fix rounds are the maximum.

## User story

As the maintainer of API Response Simulator, I want every current user-visible flow covered by an isolated Playwright test that also runs on pull requests, so that a broken mock is caught before I submit a store build.

As the person running `/feature`, I want the tester to write each new feature's tests from the spec and show them failing before Dev starts, so that the tests describe the criterion rather than the implementation that just landed.

## Assumptions

Phase 1: skip

- This line applies only to this spec. The command skips Phase 1 only when a line is exactly those three words after trimming whitespace. A code span does not count. role-spec, when writing any later spec, does not add that line.
- This `/feature` run is already past the point where a new phase could be inserted ahead of Dev. The behaviors under test already exist. A test written against them goes green as soon as the harness exists, so "red before implementation" is the wrong proof for this PR. The proof that the new tests can fail is the break-it step in acceptance criterion 6.
- Dev authors the baseline `e2e/**/*.spec.ts` files in this PR. That is the one PR where Dev may create those files. Later specs do not list `e2e/**/*.spec.ts` as Dev-owned. After this merges, Dev does not edit `e2e/**/*.spec.ts`. If a test looks wrong, Dev stops and tells the human.
- `npm test` stays `playwright test` and still expects `dist/` to exist. `npm run test:e2e` is the clean-checkout command: build, then the same Playwright run. The Dev done gate stays `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`.
- The second local command is a green run with `e2e/smoke.spec.ts`, `e2e/rules.spec.ts`, `e2e/persistence.spec.ts`, `e2e/intercept.spec.ts`, `e2e/import-export.spec.ts`, and `e2e/edge.spec.ts` listed in reverse discovery order. It is a second execution, and it is not a shuffle. `fullyParallel: true` and `workers: 2` run tests together. Each test's own user-data-dir is what keeps one test from reading another test's rules. CI runs `npm run test:e2e` only.
- The headless choice is the one already in `e2e/extension.ts`: Playwright's Chromium (`channel: 'chromium'`), `headless: true`, `launchPersistentContext`, `--disable-extensions-except`, and `--load-extension`. That is the new-headless Chromium path Playwright documents for extensions. `xvfb-run` is not added in this PR. It is added only if that headless launch fails on the `e2e` job, and the PR says so.
- No new npm package. The local site is a Node `http` server. Flaky reporting is a small script in `e2e/`. Playwright stays in `devDependencies`. `dependencies` stay `react` and `react-dom`.
- Toolbar badge, tooltip, and icon are not current behavior. Searched `src/` and the repo for `setBadgeText`, `setBadgeBackgroundColor`, `setTitle`, and `setIcon`: no calls. The manifest has a single `action.default_icon` and no `default_title`. This spec does not add them. `specs/002-toolbar-on-off-status.md` is not in this working tree.
- "Header injection" in the issue is response headers on the mocked `fetch` response. `buildHeaders` always sets `Content-Type: application/json`, then copies `responseHeaders`. The XHR patch sets status and body and fires `readystatechange`, then `load`, then `loadend`. It does not implement `getResponseHeader`. This PR leaves that as it is. Tests assert custom headers on `fetch` only.
- Matching is first enabled rule in array order whose method and glob match. `addRule` appends. There is no priority field. Globs are unanchored and case-insensitive. `*` and `?` are wildcards. Other regex characters are literal. The protocol is optional because `findMatch` tests the raw URL and the protocol-stripped URL.
- Global on/off is `settings.extensionEnabled`, default `true`. The control is the popup header switch. Its `title` is `Disable extension` when on and `Enable extension` when off. When off, the popup also shows the text `(extension disabled)`. The active-count line is `{active} of {total} rule` plus `s` only when `total !== 1`, then ` active`. Examples: `1 of 1 rule active`, `0 of 1 rule active`.
- Import and export exist on the options page. Export downloads `api-response-simulator-rules-YYYY-MM-DD.json` with `version: 1`, `exportedAt`, and `rules`. The button is disabled when there are no rules. Import appends, assigns new ids, and skips invalid entries. Status text is the copy in `ImportExportButtons.tsx`, including `File is not valid JSON.` and `Imported 1 rule (skipped 1 invalid).` The three-second fade is not automated.
- `delayMs` stays a product field and has no test in this suite. A timing upper bound is a flake source, and the issue's edge list does not include delay.
- The ruleset edit happens after the first green `e2e` run. This `/feature` command stops before a PR, so the human applies it. If no ruleset exists yet, the human creates one. Dev does not invent a new ruleset inside the repo.
- The GitHub check context is confirmed from that green run. The expected context is `CI / e2e` from workflow name `CI` and job `e2e`.
- Popup URL is `chrome-extension://<id>/popup/index.html`. Options URL is `chrome-extension://<id>/options/index.html`. The issue's `popup.html` path does not match this build.
- Content scripts do not run on `chrome-extension://` pages. Probes run on the local `http://127.0.0.1:4173/` page, which is covered by `<all_urls>`.
- The probe page does not call `fetch` or XHR on load. Rules are saved first, then the page is opened, then a button click sends the request. That matches how a person checks a rule and avoids the `document_start` race where the interceptor still has an empty rule list.
- Port `4173` is fixed. `reuseExistingServer` is false in CI and locally. `e2e/server.mjs` binds `127.0.0.1:4173` only. If that port is already taken, the process exits non-zero and prints that 4173 is in use. The Playwright run fails with that error. It does not reuse an existing server. Patterns in tests use `127.0.0.1:4173/...` with no protocol.
- One test may cover two matrix rows when both rows name that test. Toolbar badge is the only row with status `cannot automate`.
- role-qa still does not write tests. The sentence in `.cursor/agents/role-qa.md` that tells QA not to add tests stays.

## Scope

One PR. Baseline tests, the harness they need, CI, and the pipeline text.

### A. Test infrastructure

Harness files Dev owns in this PR:

| File | What it does |
|---|---|
| `e2e/extension.ts` | Launch helper and Playwright fixtures |
| `e2e/server.mjs` | Local site and `/api/*` |
| `e2e/report-flaky.mjs` | Writes the flaky list for the CI summary |
| `playwright.config.ts` | Workers, retries, traces, `webServer`, reporters |
| `package.json` | Scripts only |

`launchExtension(userDataDir)` uses `chromium.launchPersistentContext` with `channel: 'chromium'`, `headless: true`, a unique existing directory, `--disable-extensions-except`, and `--load-extension`. Paths passed in args use forward slashes so the same launch works on Windows and on the Ubuntu runner. A comment at the top of `launchExtension` states the headless choice and that `xvfb-run` is not used.

The default fixture creates a `mkdtemp` directory under the OS temp dir, launches into it, and deletes that directory when the test ends, including when the test fails. Each test gets its own directory. The fixture still exposes `context`, `page`, and `extensionId`. `extensionId` is the host of the service worker URL. The wait for the service worker stays 15 seconds.

The fixture also exposes `userDataDir`. A persistence test calls `launchExtension` twice on one directory it creates, then deletes that directory. It does not reuse another test's directory.

`openExtensionPage(context, extensionId, 'popup' | 'options')` opens the two URLs above.

`readExtensionState(serviceWorker)` runs inside the service worker and returns `rules`, `settings`, `badgeText` (`chrome.action.getBadgeText({})`), and `title` (`chrome.action.getTitle({})`). `B3` calls it and expects the call to resolve. Baseline tests do not assert badge text or title strings.

Every context from `launchExtension` continues requests whose protocol is `chrome-extension:` or `blob:`, or whose hostname is `127.0.0.1` or `localhost`. Every other request is aborted. Aborted browser traffic does not fail the test by itself. A probe that expected the local server and did not reach it fails its own assertion.

`e2e/server.mjs` binds `127.0.0.1:4173` only. If that port is already taken, the process exits non-zero and prints that 4173 is in use. The Playwright run fails with that error. It does not reuse an existing server. The process serves:

- `GET /` — the probe page.
- Any method under `/api/` — status `200`, header `X-From-Server: yes`, `Content-Type: application/json`, body `JSON.stringify({ source: 'server', method, path })` using the request method and pathname. `GET /api/users`, `GET /api/other`, `POST /api/users`, and `GET /api/a.b(c)` are that one handler.

The probe page buttons, each a `data-testid`:

| Test id | Request |
|---|---|
| `fetch-get-users` | `fetch` GET `/api/users` |
| `fetch-get-other` | `fetch` GET `/api/other` |
| `fetch-post-users` | `fetch` POST `/api/users` |
| `fetch-get-special` | `fetch` GET `/api/a.b(c)` |
| `xhr-get-users` | XHR GET `/api/users`, listeners registered with `addEventListener` before `send` |

The element `data-testid="probe-result"` is replaced, after each click, with JSON text: `status`, `body`, `contentType`, `mockHeader` (value of `X-Mock-Test`, or null), `serverHeader` (value of `X-From-Server`, or null), and `events` (XHR event names in the order `addEventListener` saw them; `[]` for fetch).

`playwright.config.ts`:

- `testDir: './e2e'`
- `fullyParallel: true`
- `workers: 2`
- `retries: process.env.CI ? 1 : 0`
- `timeout: 45_000`
- `expect.timeout: 10_000`
- `forbidOnly: !!process.env.CI`
- `trace: 'retain-on-failure'`
- `screenshot: 'only-on-failure'`
- reporters: `list`, `html` with `open: 'never'`, and `json` to `test-results/results.json`
- `webServer`: `node e2e/server.mjs`, url `http://127.0.0.1:4173`, `reuseExistingServer: false`, timeout 20 seconds

`B11` may call `test.setTimeout(60_000)`. No other test raises the timeout. No test calls `page.waitForTimeout` or otherwise sleeps. Waiting is an assertion retry (`expect.poll` or a locator assertion) inside the 10 second expect timeout.

Scripts:

- `"test": "playwright test"`
- `"test:e2e": "npm run build && playwright test"`
- `"test:e2e:reverse": "npm run build && playwright test e2e/smoke.spec.ts e2e/rules.spec.ts e2e/persistence.spec.ts e2e/intercept.spec.ts e2e/import-export.spec.ts e2e/edge.spec.ts"`

`test:e2e:reverse` passes those six files in this order: `e2e/smoke.spec.ts`, `e2e/rules.spec.ts`, `e2e/persistence.spec.ts`, `e2e/intercept.spec.ts`, `e2e/import-export.spec.ts`, `e2e/edge.spec.ts`. Every `e2e/*.spec.ts` file is in that list.

Spec files import from `./extension` and `@playwright/test` only. They do not import from `src/`.

`data-testid` values Dev adds, and nothing else, in the React components. No behavior, copy, class, or layout change.

| Test id | Where |
|---|---|
| `global-toggle` | Popup header switch |
| `extension-disabled` | Popup `(extension disabled)` text |
| `popup-rule` | Popup rule row. Also `data-rule-name` set to the rule name |
| `popup-rule-toggle` | Switch inside that row |
| `open-settings` | Popup **Open settings** button |
| `add-rule` | Options **Add rule** button |
| `export-rules` | Export button |
| `import-rules` | Import button |
| `import-file` | Hidden file input |
| `import-export-status` | The status message element |
| `rule-card` | Options card. Also `data-rule-name` set to the rule name |
| `rule-enabled-toggle` | Card switch |
| `rule-edit` | Card **Edit** |
| `rule-delete` | Card **Delete** |
| `rule-delete-confirm` | Card **Confirm** |
| `rule-delete-cancel` | Card delete **Cancel** |
| `rule-name` | Form name input |
| `rule-url-pattern` | Form URL pattern input |
| `rule-method` | Form method select |
| `rule-status-code` | Form status input |
| `rule-response-body` | Form body textarea |
| `rule-delay` | Form delay input |
| `add-header` | **+ Add header** |
| `header-row` | One header row |
| `header-key` | Key input in that row |
| `header-value` | Value input in that row |
| `remove-header` | Remove control in that row |
| `save-rule` | **Save rule** |
| `cancel-rule` | Form **Cancel** |

### B. Baseline suite

Titles are exact. One test per title. The two existing smoke titles stay the canary.

| Id | Title | Behavior the test protects |
|---|---|---|
| B1 | `B1: unpacked extension options page shows the product name` | Options page shows heading **API Response Simulator** |
| B2 | `B2: unpacked extension popup shows the product name` | Popup shows **API Response Simulator** |
| B3 | `B3: service worker is running and stored state is readable` | A service worker is running, the extension id is non-empty, and `readExtensionState` resolves with `rules` and `settings` |
| B4 | `B4: creating a rule shows it on the options page` | **Add rule**, name `Users`, pattern `127.0.0.1:4173/api/users`, method GET, status `201`, body `{"source":"mock"}`, header `X-Mock-Test` / `yes`, delay `0`, **Save rule**. The card shows `Users`, `GET`, `201`, and the pattern |
| B5 | `B5: editing a rule keeps the new name and response body` | In this test's own profile, save name `Users`, pattern `127.0.0.1:4173/api/users`, method GET, status `201`, and body `{"source":"mock"}`. Edit that card. Change the name to `Users edited` and the body to `{"source":"edited"}`. Save. The card shows `Users edited`. Open Edit on that card again. The body field shows `{"source":"edited"}`. The test does not open another test's profile |
| B6 | `B6: confirming delete removes the rule and cancel keeps it` | **Delete** then **Cancel** leaves the card. **Delete** then **Confirm** removes it. The empty options copy `No rules yet. Add your first rule.` is visible |
| B7 | `B7: matching fetch returns the mocked status, body, and custom response header only for that request` | After B4's rule exists in that test's own profile: `fetch-get-users` yields status `201`, body `{"source":"mock"}`, content type `application/json`, mock header `yes`, server header null. `fetch-get-other` yields `source` `server`, path `/api/other`, server header `yes`, mock header null |
| B8 | `B8: matching XHR returns the mocked status and body and fires readystatechange, load, then loadend` | Same kind of GET rule. `xhr-get-users` yields status `201`, the mock body, and `events` exactly `["readystatechange","load","loadend"]` |
| B9 | `B9: non-matching fetch returns the test server response` | A rule for `127.0.0.1:4173/api/users` only. `fetch-get-other` returns the server JSON for GET `/api/other` and server header `yes` |
| B10 | `B10: global off returns the real response and global on returns the mock without reloading the page` | With a matching rule and the probe page left open: popup `global-toggle` turns the extension off. The toggle's `title` is `Enable extension`, and `extension-disabled` is visible. Poll `fetch-get-users` with `expect.poll` until the body matches the off state the toggle just showed, the server JSON, inside the 10 second expect timeout. Click the toggle again. Poll `fetch-get-users` with `expect.poll` until the body matches the on state the toggle just showed, the mock, inside the 10 second expect timeout. The probe page is not reloaded |
| B11 | `B11: rules and the on/off setting persist after the context reopens in the on state and in the off state` | Save a matching rule, close the context, open a new one on the same user-data-dir. The rule is on the options page and `fetch-get-users` is mocked. Turn the popup toggle off, close, reopen the same directory. The rule is still listed, `(extension disabled)` is visible, and `fetch-get-users` is the server JSON |
| B13 | `B13: export downloads the rules JSON and import appends them with new ids` | With rule `Users` saved (pattern `127.0.0.1:4173/api/users`, method GET, status `201`, body `{"source":"mock"}`), **Export** downloads a file whose name matches `api-response-simulator-rules-YYYY-MM-DD.json`. The saved rule includes header `X-Mock-Test` / `yes`. The downloaded JSON has `version` `1`, a string `exportedAt`, and one rule with that name, pattern, method, status, body, and header. Import that file. The options page shows two cards named `Users`. The original id from `readExtensionState` is unchanged, and the second id is different. Disable the original card. `fetch-get-users` then returns status `201`, body `{"source":"mock"}`, and mock header `yes` |
| B14 | `B14: invalid import shows an error and a mixed file skips invalid rules` | A fresh profile. Importing the text `not-json` shows `File is not valid JSON.` Importing `{"version":1,"rules":[{"name":"Ok","urlPattern":"127.0.0.1:4173/api/users","method":"GET","statusCode":200},{"name":""}]}` shows `Imported 1 rule (skipped 1 invalid).` and one card named `Ok` |
| B15 | `B15: export is disabled when there are no rules` | On a fresh options page the export button is disabled |
| B16 | `B16: popup active count and rule toggle follow the rule` | After one enabled rule, the popup shows `1 of 1 rule active` and the rule name. With the probe page open, `popup-rule-toggle` then shows `0 of 1 rule active`. Poll `fetch-get-users` with `expect.poll` until the body matches the disabled state the toggle just showed, the server JSON, inside the 10 second expect timeout. The probe page is not reloaded |

B12 is not a separate test. The custom-header behavior is B7. The matrix maps that behavior to B7.

Files: `e2e/smoke.spec.ts` (B1–B3), `e2e/rules.spec.ts` (B4–B6), `e2e/persistence.spec.ts` (B11), `e2e/intercept.spec.ts` (B7–B10, B16), `e2e/import-export.spec.ts` (B13–B15), `e2e/edge.spec.ts` (E1–E6). `test:e2e:reverse` passes those six files in this order: `e2e/smoke.spec.ts`, `e2e/rules.spec.ts`, `e2e/persistence.spec.ts`, `e2e/intercept.spec.ts`, `e2e/import-export.spec.ts`, `e2e/edge.spec.ts`. Every `e2e/*.spec.ts` file is in that list. The title and the behavior stay.

### C. Tester subagent and pipeline

Update these files so they describe one procedure. The procedure lives in `.cursor/agents/role-tester.md`. `feature.md` only says when to launch it and when to stop. `project-core.mdc` only states who may write which files. `AGENTS.md` and `docs/agent-workflow.md` tell the human the same order. They do not grow a second copy of the phase checklist.

**`.cursor/agents/role-tester.md`**

- Frontmatter `name` stays `role-tester`.
- Description: use when the human invokes `@role-tester` or `/role-tester` for Phase 1 (write failing tests from a spec) or Phase 2 (acceptance check). Ends with a STOP.
- The requirements-review refusal stays, including the exact reply text and the path normalization already in the file.
- Phase 1 starts when the message asks to write Playwright tests from the spec before implementation. Phase 2 starts when the message asks for an acceptance check, Phase 2, or manual verification steps. A message that asks for both stops with no edits and no test run. The human is told to pick one phase.
- Phase 1 writes or updates `e2e/**/*.spec.ts` and the spec's **Coverage matrix** only. Tests are black-box: the spec, the harness comments in `e2e/extension.ts`, and this spec's selector table are the inputs. Phase 1 does not read `src/` to copy the implementation under test. It does not edit `src/`, the harness, CI, acceptance criteria, or docs.
- Each new test title starts with the criterion id from that spec, for example `AC-3: badge updates within 1s after toggle`.
- Phase 1 runs `npm run test:e2e` and pastes the output. Done for Phase 1 means the new tests failed on an assertion about the missing behavior, and the fixture, the server, and the extension all started. A timeout, a missing element from the harness, a build error, or an extension that never loaded is a setup failure, not a successful red. On a setup failure the tester may repair the new tests and run once more. A second setup failure stops and asks the human.
- If the new tests pass in Phase 1, Phase 1 stops and asks the human. It does not delete or weaken them, and it does not tell Dev to start.
- A criterion that cannot be automated gets a matrix row `cannot automate` and a reason. It gets no test that asserts nothing.
- If the tester believes a test is wrong, Phase 1 stops and asks the human. It does not weaken, skip, or delete the test.
- Phase 1 done line: `Next: new chat, @role-dev @specs/NNN-*.md`.
- Phase 2 judges each acceptance criterion **MET** / **NOT MET** / **CANNOT VERIFY** with evidence. It runs `npm run lint`, `npm run typecheck`, and `npm test`, and pastes the output. It does not add a separate build requirement. It flags behavior in `git diff main` that the spec does not mention.
- Phase 2 writes **Manual verification steps** and replaces `pending` in the **Coverage matrix** status column with `pass`, `fail`, or `cannot automate` plus a reason. A row the spec under test says stays `pending` is left `pending`. An acceptance-check message that says to write manual steps only still allows those status cells. Phase 2 does not edit tests, product source, the harness, CI, or acceptance criteria. A failing test is a finding for Dev.
- Manual steps are the checks the suite cannot do: visual spacing, color, icon appearance, and the import status message disappearing after about three seconds. Each step has an expected result. The happy path plus those edges stay runnable in under five minutes.
- Phase 2 done line stays: `Next: you run the manual steps, then open a PR`.

**`.cursor/agents/role-dev.md`**

- Dev implements the spec and then addresses Phase 2 findings that are product bugs.
- Dev does not edit `e2e/**/*.spec.ts` unless the spec lists those files as Dev-owned for that PR. This spec does. A later spec that omits them is not permission.
- If a failing test looks wrong, Dev stops and tells the human. Dev does not change the test, skip it, or delete it.
- Dev does not edit acceptance criteria. The done gate and the done line stay as they are now.

**`.cursor/agents/role-spec.md`**

- Leave **Coverage matrix** as an empty table, the same way **QA review** and **Manual verification steps** are left blank. role-tester fills it in Phase 1.
- Name a `data-testid` in the spec for any new control that has no accessible name.
- Do not add a line that, after trimming whitespace, is exactly Phase 1: skip. A code span does not count.
- Do not assign `e2e/**/*.spec.ts` to Dev.

**`.cursor/rules/project-core.mdc`**

Replace the allowed-writes sentence so that:

- Spec still writes only `specs/*.md`.
- QA still writes only **QA review**.
- Tester Phase 1 writes `e2e/**/*.spec.ts` and **Coverage matrix**.
- Tester Phase 2 writes **Manual verification steps** and the status cells of **Coverage matrix**.
- Dev writes the files the spec names, and does not write `e2e/**/*.spec.ts` unless that spec lists them as Dev-owned.
- Dev still does not edit acceptance criteria.
- The `/feature` main agent still does not do those roles' work.

Replace the sentence that says a failing command does not make Tester edit code. Phase 1 may edit the tests it added when the failure is setup, within the one repair launch. Phase 2 does not edit tests or product source. A product failure is reported to Dev.

**`.cursor/commands/feature.md`**

Keep preconditions, spec, QA (maximum 2 rounds), the commit split, the run log, and the stop rules. Insert Tester Phase 1 between QA and Dev. Keep Dev at maximum 3 attempts. Keep Tester Phase 2 at maximum 2 fix rounds.

Phase 1 launches only when the spec file has no line that, after trimming whitespace, is exactly Phase 1: skip. A code span does not count. This spec's Assumptions section has that line, so a future run of the updated command skips Phase 1 for this file and Dev may create the spec files this spec names.

Phase 1 launch prompt:

> You are invoked with `@role-tester`. Phase 1 for `specs/NNN-slug.md`. From the spec only, write Playwright tests for every acceptance criterion that can be automated. Titles carry the criterion id. Fill the **Coverage matrix**. Run `npm run test:e2e` and paste the output. Show that the new tests fail because the behavior is absent. Do not edit product source, the harness, CI, or acceptance criteria. Do not weaken, skip, or delete a test. If a test looks wrong, stop and ask the human. Do not commit, push, or open a PR.

Phase 1 attempts: at most 2 launches. The second launch happens only when the first result is a setup failure and the tester is repairing tests. If the tests fail for the right reason, Phase 1 is finished in one launch. If they pass, or the second launch is still setup, or the tester asks the human, stop the pipeline. Do not start Dev. Do not commit or push.

Dev's first-attempt prompt gains these sentences: do not edit `e2e/**/*.spec.ts` unless the spec lists them as Dev-owned; if a test looks wrong, stop and tell the human. The four commands and the green rule stay. `npm test` still needs the build that just ran. For this spec, Dev also runs `npm run test:e2e:reverse` and the break-it proof, and pastes both.

Phase 2 launch prompt:

> You are invoked with `@role-tester`. Phase 2 acceptance check for `specs/NNN-slug.md` against `git diff main`. For each acceptance criterion report MET, NOT MET, or CANNOT VERIFY with evidence. Run `npm run lint`, `npm run typecheck`, and `npm test`, and paste the output. Update **Coverage matrix** status cells. Leave a row `pending` when the spec says that row stays `pending`. Write **Manual verification steps**. Do not edit tests, product source, or acceptance criteria. Do not commit, push, or open a PR.

A fix round is one Dev launch with the NOT MET findings, then, if that launch is green, one Phase 2 launch. Maximum 2 fix rounds. Dev still does not edit the tests. If Dev says a test is wrong, stop the pipeline and report. `CANNOT VERIFY` does not start a fix round. After 2 fix rounds with any NOT MET, stop and report. Do not commit or push.

The printed PR description gains three sections, filled from the spec, the Dev report, and the tester report:

- **Coverage matrix** — the table from the spec
- **Break-it proof** — the failing output and the restored green output when the spec asked for them; otherwise `None.`
- **CI** — `Add the e2e job link after the first green run.`

**`AGENTS.md` and `docs/agent-workflow.md`**

- The flow the human reads is: spec, QA requirements review, tester Phase 1, Dev, tester Phase 2, manual steps, PR, CI, merge.
- This spec is the exception. Its Assumptions section has a line that, after trimming whitespace, is exactly Phase 1: skip. A code span does not count.
- Document `npm run test:e2e` as build plus the headless suite, and `npm test` as Playwright after a build.
- The CI sentence names job `e2e`, the flaky summary, and the failure artifacts.
- Example prompts for Phase 1 and Phase 2 use `@role-tester` and a spec path.
- `/feature` limits in the doc match the command: QA 2, Phase 1 2, Dev 3, Phase 2 fix rounds 2.

**`specs/_template.md`**

Add this section after **Edge cases** and before **Test notes**. role-spec leaves the table empty. role-tester fills it.

```
## Coverage matrix

Filled by role-tester. Leave this table empty in the spec draft.

| Criterion | Test | Status |
|---|---|---|
| | | |
```

**`README.md`**

In the Development command block, add `npm run test:e2e` as the command that builds and runs the suite headless. Keep the existing `npm test` line.

**`.github/pull_request_template.md`**

Add headings **Coverage matrix**, **Break-it proof**, and **CI**.

### D. CI

Edit `.github/workflows/ci.yml`. Keep `name: CI`, `on: pull_request`, and the pinned-SHA style already used for actions.

Job `verify` keeps checkout, Node 22, `npm ci`, lint, typecheck, and build. It does not install Playwright and does not run the suite. `timeout-minutes: 10`.

Job `e2e` runs in parallel with `verify` (no `needs`). `timeout-minutes: 15`. Steps:

1. Checkout and Node 22 with the npm cache, same as `verify`.
2. Cache the Playwright browser directory (`~/.cache/ms-playwright` on the Ubuntu runner). Key the cache on the OS and `package-lock.json`. Pin `actions/cache` to a full commit SHA and comment the version tag the same way the other actions are commented.
3. `npm ci`.
4. `npx playwright install --with-deps chromium`.
5. `npm run test:e2e`.
6. Always run `node e2e/report-flaky.mjs`. The script reads `test-results/results.json`. It appends a `## Flaky tests` section to `GITHUB_STEP_SUMMARY`. A test is flaky when it failed or timed out and a later attempt passed. List each flaky test's title. When none are flaky, write `No flaky tests.` Also append `## Failed tests` with titles, or `No failed tests.` The script exits 0. Locally, with `GITHUB_STEP_SUMMARY` unset, it prints the same text and exits 0.
7. On failure, upload `playwright-report/` and `test-results/` as separate artifacts, retention 14 days, `if-no-files-found: ignore`.

`timeout-minutes: 15` covers the whole job: checkout, `npm ci`, a cold `npx playwright install --with-deps chromium`, the build inside `npm run test:e2e`, and the suite. The "under 5 minutes" limit applies only to the `npm run test:e2e` step on a run that restored the Playwright browser cache. If that warm test step is over 5 minutes, Dev stops and tells the human. Dev does not drop a test to make the time.

After that green run, the human adds the check context (expected `CI / e2e`, confirmed on the run) to the existing ruleset that protects the default branch. Keep the checks that are already required. If the `gh` account cannot edit the ruleset, or no ruleset exists, the PR description says so and includes the `gh api` read that was tried. Dev does not add a new ruleset file to bypass that.

### Product files left unchanged

The committed diff does not modify `src/content/interceptor.ts`, `src/content/bridge.ts`, `src/background/service-worker.ts`, `public/manifest.json`, `src/shared/types.ts`, or `src/shared/storage.ts`. The break-it edit is restored before the work is finished. `package.json` `dependencies` and `devDependencies` are unchanged. Rebuilt `dist/` is committed because the popup and options bundles gain the test ids.

## Out of scope

- Unit tests, visual regression, Firefox, Edge, performance tests, and coverage percentages.
- A new toolbar badge, tooltip, or icon. A separate spec owns that if the product grows one.
- Changing match order, glob rules, XHR header exposure, import semantics, or the interceptor.
- Request-header injection. The product sets response headers.
- Automating the three-second import/export status fade.
- A `delayMs` timing test.
- `xvfb-run` while headless Chromium loads the extension.
- A new npm dependency.
- Running a second `/feature` inside this PR to rehearse Phase 1.
- Opening or merging the PR. `/feature` still stops before the PR. The human opens it.

## Acceptance criteria

1. Given a checkout with dependencies installed and no separate build step, when `npm run test:e2e` runs, then it builds `dist/`, launches headless Chromium with the unpacked extension, runs every test in `e2e/`, and exits 0. E1 is one of those tests. A failing E1 fails the command. Until the human removes E1 from the required titles, its matrix row stays `pending` and is not set to `cannot automate`.
2. Given that same checkout, when `npm run test:e2e:reverse` runs, then it exits 0. That command passes `e2e/smoke.spec.ts`, `e2e/rules.spec.ts`, `e2e/persistence.spec.ts`, `e2e/intercept.spec.ts`, `e2e/import-export.spec.ts`, and `e2e/edge.spec.ts` in that order. Every `e2e/*.spec.ts` file is in that list. The run is a second execution. It is not a shuffle. Given the Playwright config, when either command runs, then `workers` is 2 and `fullyParallel` is true. Those settings run tests together. Each test's own user-data-dir is what keeps one test from reading another test's rules. No test requests a host other than `127.0.0.1` or `localhost`.
3. Given the suite, when the test titles are listed, then each title in the baseline table and each title in the edge table appears once, and the test body asserts the behavior that title names.
4. Given a pull request, when workflow `CI` runs, then job `e2e` runs `npm run test:e2e`. A failing test fails job `e2e`. The failed run's artifacts include the HTML report, traces, and screenshots.
5. Given the first green `e2e` job on that pull request, when the human updates the ruleset for the default branch, then the required status checks include the `e2e` check context from that run. Until the ruleset shows it, this criterion is **CANNOT VERIFY**. That result does not start a fix round.
6. Given a green suite, when `findMatch` in `src/content/interceptor.ts` is changed so it always returns null, and `npm run test:e2e` is run, then at least one of B7, B8, B9, or B10 fails. When that edit is restored and `npm run test:e2e` runs again, then the suite exits 0. The Dev report includes both outputs under `Break-it proof`. The committed diff does not contain the edit.
7. Given the updated `.cursor/commands/feature.md`, when a later spec has no line that, after trimming whitespace, is exactly Phase 1: skip, then the command launches role-tester Phase 1 before the first Dev launch, allows at most two Phase 1 launches, and stops without committing if the new tests pass or still fail setup. A code span does not count as that line. This spec's Assumptions section has the exact line, so the command skips Phase 1 for this file. Dev's prompt says not to edit `e2e/**/*.spec.ts` unless the spec lists them as Dev-owned, and to stop when a test looks wrong. Phase 2 allows at most two fix rounds.
8. Given a test that fails and then passes on the one CI retry, when job `e2e` finishes, then the job summary's `## Flaky tests` section lists that test's title. Given a run with no such test, when the job finishes, then that section says `No flaky tests.` Local retries stay 0. CI retries stay 1.
9. Given `package.json` after the change, when its dependency lists are compared with the lists before the change, then `dependencies` and `devDependencies` are the same. The local server and the flaky script use Node and Playwright only.

## Edge cases

Each row is one test. Titles are exact.

| Id | Title | What the test does |
|---|---|---|
| E1 | `E1: service worker restart keeps stored rules and the mocked response` | Save a matching rule and see a mocked `fetch-get-users`. Call `chrome.runtime.reload()` from the service worker, wait until a service worker is running again, reload the probe page, and see the same mock. `readExtensionState` still has the rule and `extensionEnabled: true` |
| E2 | `E2: rapid global toggling ends on the last chosen state` | With a matching rule and the probe page open, start from the default on state, whose switch title is `Disable extension`. Each click waits, with a locator assertion on the title and no `waitForTimeout`, until the title flips. After the fifth flip the title is `Enable extension`. Poll `fetch-get-users` with `expect.poll` until it returns the server JSON, inside the 10 second expect timeout. One more flip waits until the title is `Disable extension`, then poll `fetch-get-users` with `expect.poll` until it returns the mock, inside the 10 second expect timeout. The probe page is not reloaded |
| E3 | `E3: a rule with special characters and an empty body is returned unchanged` | Name `Quotes "and" <tags> & more`, pattern `127.0.0.1:4173/api/a.b(c)`, method GET, status `200`, body empty. The card shows that name. `fetch-get-special` returns status `200`, body `""`, and content type `application/json` |
| E4 | `E4: a large response body is returned unchanged` | Body is 32000 `a` characters followed by `END`. Pattern `127.0.0.1:4173/api/users`, GET, status `200`. `fetch-get-users` returns that exact string |
| E5 | `E5: the first enabled matching rule wins until it is disabled` | Save `First rule` then `Second rule`, both GET, both pattern `127.0.0.1:4173/api/*`, bodies `{"n":1}` and `{"n":2}`. With the probe page open, poll `fetch-get-users` with `expect.poll` until it returns `{"n":1}`, inside the 10 second expect timeout. Turn off `First rule` on its card. Poll `fetch-get-users` with `expect.poll` until the body matches the state the toggle just showed, `{"n":2}`, inside the 10 second expect timeout. The probe page is not reloaded |
| E6 | `E6: a POST rule does not mock a GET to the same URL` | One rule, method POST, pattern `127.0.0.1:4173/api/users`, body `{"n":"post"}`. `fetch-get-users` returns the server JSON. `fetch-post-users` returns `{"n":"post"}` |

E1 reloads the probe page because an extension reload drops the old content scripts. B10 and E2 do not reload it.

E1 is required for the suite to exit 0. It uses the 45 second test timeout and does not call `waitForTimeout`. If Dev cannot get E1 to pass twice in a row under those rules, Dev stops and tells the human what was tried. Dev does not delete the test, skip it, weaken the assertion, or set its matrix row to `cannot automate`. Only the human may remove E1 from the required titles. Until the human does that, the row stays `pending` and a failing E1 fails the suite.

## Coverage matrix

role-tester Phase 2 replaces `pending` with `pass` or `fail` after `npm test`. The E1 row stays `pending` until the human removes E1 from the required titles. Phase 2 does not set the E1 row to `cannot automate`. A failing E1 fails the suite. The toolbar row stays `cannot automate`. Dev does not edit this table.

| Criterion | Test | Status |
|---|---|---|
| B1 Options page shows the product name | `B1: unpacked extension options page shows the product name` | pass |
| B2 Popup shows the product name | `B2: unpacked extension popup shows the product name` | pass |
| B3 Service worker running and stored state readable | `B3: service worker is running and stored state is readable` | pass |
| B4 Create a rule | `B4: creating a rule shows it on the options page` | pass |
| B5 Edit a rule | `B5: editing a rule keeps the new name and response body` | pass |
| B6 Delete a rule, including cancel | `B6: confirming delete removes the rule and cancel keeps it` | pass |
| B7 Matching fetch status, body, and response headers | `B7: matching fetch returns the mocked status, body, and custom response header only for that request` | pass |
| B8 Matching XHR status, body, and event order | `B8: matching XHR returns the mocked status and body and fires readystatechange, load, then loadend` | pass |
| B9 Non-matching request unchanged | `B9: non-matching fetch returns the test server response` | pass |
| B10 Global off and on | `B10: global off returns the real response and global on returns the mock without reloading the page` | pass |
| B11 Persist across restart, on and off | `B11: rules and the on/off setting persist after the context reopens in the on state and in the off state` | pass |
| Custom response header on the matching fetch only | `B7: matching fetch returns the mocked status, body, and custom response header only for that request` | pass |
| B13 Export and append import | `B13: export downloads the rules JSON and import appends them with new ids` | pass |
| B14 Invalid and mixed import | `B14: invalid import shows an error and a mixed file skips invalid rules` | pass |
| B15 Export disabled with no rules | `B15: export is disabled when there are no rules` | pass |
| B16 Popup count and per-rule toggle | `B16: popup active count and rule toggle follow the rule` | pass |
| E1 Service worker restart | `E1: service worker restart keeps stored rules and the mocked response` | pending |
| E2 Rapid toggling | `E2: rapid global toggling ends on the last chosen state` | pass |
| E3 Special characters and empty body | `E3: a rule with special characters and an empty body is returned unchanged` | pass |
| E4 Large body | `E4: a large response body is returned unchanged` | pass |
| E5 Two matching rules, first enabled wins | `E5: the first enabled matching rule wins until it is disabled` | pass |
| E6 Method mismatch | `E6: a POST rule does not mock a GET to the same URL` | pass |
| Toolbar badge, tooltip, and icon | — | cannot automate: nothing in the extension calls `chrome.action.setBadgeText`, `setTitle`, or `setIcon`. The popup switch, its title, and `(extension disabled)` are B10 and B16. |
| AC-1 `npm run test:e2e` builds and passes headless | The command itself. Phase 2 records the exit status | pass |
| AC-2 Second listed-file run, two workers, isolated profiles | `npm run test:e2e:reverse` plus the config. Phase 2 records the exit status | pass |
| AC-4 CI job, red build, artifacts | Job `e2e` in `.github/workflows/ci.yml`. A red run is observed on a pull request | pass |
| AC-5 Ruleset requires `e2e` | The ruleset after the first green run | cannot automate: the human adds the e2e check after the first green run; gh is not authenticated, so this check could not read a ruleset |
| AC-6 Break matching and watch a test fail | `Break-it proof` in the Dev report. The edit is not in the commit | cannot automate: break-it output is not in the diff; git diff main does not change findMatch; this check does not edit it |
| AC-7 Phase 1 before Dev on the next feature | `.cursor/commands/feature.md` and `.cursor/agents/role-tester.md` | pass |
| AC-8 Flaky titles in the job summary | `e2e/report-flaky.mjs` and the `e2e` job step | pass |
| AC-9 No new dependencies | `package.json` | pass |

## Test notes

Manual steps stay on the options page, the popup, and `http://127.0.0.1:4173/` only for what the suite cannot judge.

- Options and popup: spacing, contrast, and the single indigo toolbar icon. There is one icon for on and off.
- Options, import: after a successful import, the green status line clears on its own after about three seconds. The file used is the export of one rule. Fields that matter are name, URL pattern, method, and status code.
- Popup: the header switch sits in the indigo bar and the disabled line is amber. Copy is `(extension disabled)`.

The suite already checks the rule fields name, URL pattern, method, status code, response body, response headers, and the popup on/off setting.

## QA review

QA round 2 of 2. Requirements only. The suite was not run, the extension was not loaded, and no CI job was timed. This pass re-read the revised spec against the options page, popup, import/export copy, rule form, interceptor, bridge, manifest, and the current CI workflow. `specs/002-toolbar-on-off-status.md` was checked on this branch, on `main`, and on `feat/002-toolbar-on-off-status`.

**Verdict:** APPROVE

**Biggest risk:** E1 has to pass before `npm run test:e2e` can exit 0. Reloading the extension from the service worker is the step most likely to fail twice in headless Chromium. The spec then waits for a person to remove that test. Until that happens, one restart failure blocks the whole suite.

**Findings:**

1. [High] resolved — Job `e2e` is `timeout-minutes: 15`. That budget includes checkout, `npm ci`, a cold `npx playwright install --with-deps chromium`, the build inside `npm run test:e2e`, and the suite. The five-minute limit applies only to the `npm run test:e2e` step on a run that restored the Playwright browser cache. If that warm step is over five minutes, Dev stops and tells the human, and leaves the tests in place.
   Suggested rewrite: No change. Keep the `timeout-minutes: 15` paragraph in section D.

2. [High] resolved — Assumptions has its own line, `Phase 1: skip`, with no backticks and no other characters on that line. The command text, the role-spec text, and acceptance criterion 7 all say a code span does not count, and a later spec does not get that line.
   Suggested rewrite: No change. Keep that marker as its own line under Assumptions.

3. [High] resolved — B5 saves `Users` in that test's own profile, changes the name and the body, checks the card name, then opens Edit again and checks the body field.
   Suggested rewrite: No change. Keep the B5 behavior cell.

4. [High] resolved — E1 stays required. A failing E1 fails the suite. Dev does not mark the row `cannot automate`, skip the test, or weaken it. Only a person may remove E1 from the required titles. Until then the matrix row stays `pending`. Acceptance criterion 1, the edge section, and the matrix intro say the same thing.
   Suggested rewrite: No change. Keep the E1 paragraph under Edge cases.

5. [Med] resolved — B13 checks the exported name, pattern, method, status, body, and header `X-Mock-Test` / `yes`. It then disables the original card and expects `fetch-get-users` to return status `201`, body `{"source":"mock"}`, and mock header `yes` from the imported rule.
   Suggested rewrite: No change. Keep the B13 behavior cell.

6. [Med] resolved — E2 starts from the title `Disable extension` and waits for that title to flip on every click. After the fifth flip the title is `Enable extension`, and `expect.poll` waits for the server JSON. One more flip waits for `Disable extension`, then for the mock. B10, B16, and E5 poll until the body matches the state the toggle just showed, inside the 10 second expect timeout. The probe page stays open.
   Suggested rewrite: No change. Keep the B10, B16, E2, and E5 cells.

7. [Med] resolved — E1–E6 are in `e2e/edge.spec.ts`. `test:e2e:reverse` passes all six `e2e/*.spec.ts` files, from `e2e/smoke.spec.ts` through `e2e/edge.spec.ts`. Assumptions call that run a second execution. Each test's own user-data-dir keeps one test from reading another test's rules. `workers: 2` and `fullyParallel: true` are what run the tests together.
   Suggested rewrite: No change. Keep the file list, the `test:e2e:reverse` script, and that assumptions bullet.

8. [Med] resolved — `reuseExistingServer` is false in CI and locally. `e2e/server.mjs` binds `127.0.0.1:4173` only. If that port is taken, the process exits non-zero and prints that 4173 is in use. The Playwright run fails with that error.
   Suggested rewrite: No change. Keep the port bullet in Assumptions and the `webServer` line in section A.

9. [Low] resolved — On this branch the assumptions sentence is true. `specs/002-toolbar-on-off-status.md` is absent from the worktree and from the git index, and it is absent from `main`. The approved copy is only on `feat/002-toolbar-on-off-status`. This spec leaves that file alone. Baseline tests do not assert badge text or title strings. The toolbar matrix row stays `cannot automate`.
   Suggested rewrite: No change. Leave the assumptions sentence as it is. A rewrite that says 002 is in this tree would be false on this checkout.

10. [Low] still open — Acceptance criterion 8 requires a `## Flaky tests` section and does not mention `## Failed tests`. Section D also requires `## Failed tests`, so that section has no acceptance criterion. The script must read `test-results/results.json` and exit 0. The spec does not say what happens when that file is missing. An exception there fails job `e2e` after the tests have already passed.
    Suggested rewrite: Extend acceptance criterion 8's observable result with: The job summary also contains `## Failed tests` followed by each failed title, or the line `No failed tests.` When `test-results/results.json` is missing, `node e2e/report-flaky.mjs` still exits 0, writes `No flaky tests.` under `## Flaky tests`, and writes `Results file was not produced.` under `## Failed tests`. Say the same missing-file behavior in section D, step 6.

## Manual verification steps

Filled by role-tester after implementation.

1. Load `dist/` as an unpacked extension and look at its toolbar icon. — Expected: one indigo icon.
2. Open the extension's options page. — Expected: the heading **API Response Simulator** is readable, and the heading, Import, Export, and rule area have even spacing and contrast on the gray page.
3. Add one rule. Set a name, URL pattern, method, and status code, then save. Click **Export**. — Expected: a file named `api-response-simulator-rules-YYYY-MM-DD.json` downloads, and a green status line appears.
4. Click **Import** and choose that file. Watch the status line. — Expected: a green status line appears, then disappears on its own after about three seconds. Two cards show the same name, URL pattern, method, and status code.
5. Open the popup. Turn the header switch off, look at the toolbar icon, then turn the switch on. — Expected: the switch sits in the indigo bar. While off, the amber text `(extension disabled)` is visible and the toolbar icon is unchanged. Turning it on removes that amber line, and the icon stays the same.

## Definition of done

- [ ] Spec accepted by the human
- [ ] A QA requirements review was completed; findings accepted or spec updated
- [ ] DEV implemented the spec without changing the acceptance criteria
- [ ] role-tester acceptance check completed; findings addressed by DEV
- [ ] **Coverage matrix** statuses are `pass`, `fail`, or `cannot automate`, not `pending`, except the E1 row, which stays `pending` until the human removes E1 from the required titles
- [ ] Human ran the Manual verification steps
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:e2e`, and `npm run test:e2e:reverse` were run and the output is in the PR
- [ ] The PR description includes the coverage matrix, the break-it proof, and the link to the green `e2e` job
- [ ] Job `e2e` is green and is a required check on the default branch
- [ ] No new dependency
- [ ] Human reviewed and merged the PR
- [ ] A row was added to `docs/agent-runs.csv`
