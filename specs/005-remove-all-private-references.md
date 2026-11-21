# 005 — Remove private references from the working tree

GitHub issue: https://github.com/SlobodanBogdanovic/APIResponseSimulator/issues/22

## Who is the user and what problem do they have

The user is a reader of the current README, and a person adding a response header on the options page. The reader copies the first rule from the quick-start table. The person on the options page opens **New rule** or **Edit rule** and uses **Response headers**.

The quick-start example in the current README is still a path and a rule name from an internal API. That is what those two people see in this working tree today. The rest of the product is already generic.

Older commits, GitHub issues, the repository description, and the store listing are the separate decisions in **Out of scope**. This change does not decide those.

## Problem

`README.md` teaches the first rule with the name `Get timezone zone` and the pattern `localhost:8080/api/v1/lockerconf/datetime/zone`, and the export sample and the response-body tips repeat that same example.

A case-insensitive search for employer and internal-system names has to be precise. The words `internal`, `staging`, `.local`, and `corp` appear in ordinary engineering text (`chrome.storage.local`, `Internal server error`, `staging.example.com`, `corporate`). `kebab-case` contains the letters `keba`. `blocker` contains the letters `locker`. Deleting every one of those would damage the docs and the vendored skills.

The options form already calls the control **Response headers** and stores values on `responseHeaders`. There is no separate "Env Header Rule", no `x-env` string, and no storage field that exists only for an environment header.

## Expected user outcome

The reader’s first README example is a users API. The quick-start table keeps three columns: Field, Example, and Notes. The example cells are `List users`, `localhost:3000/api/v1/users`, `GET`, `200`, `[{"id": 1, "name": "Ada"}]`, `x-debug: true`, and `0`. The URL-pattern note says the host and port are an example. The response-headers note still says `Content-Type: application/json` is always included.

On the options page, **New rule** and **Edit rule** still show the visible label `Response headers`. Before any header row is added, the empty text is exactly `No custom headers. Content-Type: application/json is always added. Example: x-debug: true.` After **Add header**, the name field’s placeholder is `x-debug` and its accessible name is `Header name`, and the value field’s placeholder is `true` and its accessible name is `Header value`.

A search of the project files and of `dist/` finds none of the employer, product, or internal-infrastructure identifiers listed in this spec. Ordinary words such as `internal`, `staging`, `.local`, and `corp` stay where they are already used as normal English or as `chrome.storage.local`.

Saved rules, the package name, and the extension name keep working. A rule’s custom response headers are still returned on a matching request.

This change cleans the current working tree and the rebuilt `dist/`. Older commits in this clone still contain the previous quick-start example.

## User story

As a reader of the current README, and as a person adding a response header on the options page, I want the current files and the rebuilt extension to use generic examples, so this working tree does not walk through an internal API.

## Scope

One PR. Working tree only, plus a rebuilt `dist/`.

Dev edits:

- `README.md` — replace the internal quick-start example, the matching export sample, and the response-body tips that continue that example. Keep the quick-start Notes column.
- `src/options/components/RuleForm.tsx` — copy and accessible names only. The empty-state sentence, the two header placeholders, and `aria-label` on the two existing header inputs change. Layout, color, type, and controls stay as they are. No new control is added.
- `dist/` — rebuild with `npm run build` after the source edit so the options bundle shows the new copy. Commit the rebuilt `dist/`.

The quick-start table stays three columns and becomes:

| Field | Example | Notes |
|---|---|---|
| Name | `List users` | A label for yourself |
| URL pattern | `localhost:3000/api/v1/users` | See pattern syntax below. Host and port are an example. |
| Method | `GET` | Or `ANY` to match all methods |
| Status code | `200` | Any HTTP status 100–599 |
| Response body | `[{"id": 1, "name": "Ada"}]` | Any text or JSON string |
| Response headers | `x-debug: true` | `Content-Type: application/json` is always included |
| Delay ms | `0` | Add artificial latency if needed |

The export sample is one fenced JSON block. Keep `version` `1`, `exportedAt` `2026-04-25T12:00:00.000Z`, `id` `…`, `enabled` true, `statusCode` 200, `delayMs` 0, and `createdAt` 1714041600000. The rule name is `List users`, `urlPattern` is `localhost:3000/api/v1/users`, and `method` is `GET`. `responseBody` is a JSON string whose decoded text is exactly `[{"id": 1, "name": "Ada"}]`. `responseHeaders` is an array of one object, key `x-debug`, value `true`. The block is:

```json
{
  "version": 1,
  "exportedAt": "2026-04-25T12:00:00.000Z",
  "rules": [
    {
      "id": "…",
      "name": "List users",
      "enabled": true,
      "method": "GET",
      "urlPattern": "localhost:3000/api/v1/users",
      "statusCode": 200,
      "responseBody": "[{\"id\": 1, \"name\": \"Ada\"}]",
      "responseHeaders": [
        { "key": "x-debug", "value": "true" }
      ],
      "delayMs": 0,
      "createdAt": 1714041600000
    }
  ]
}
```

**Response body tips** has two changed tip blocks and one tip that stays. The **JSON example** fenced block’s text is exactly `[{"id": 1, "name": "Ada"}]`. The **Error response example (status 422)** fenced block is exactly:

```json
{
  "error": "Validation failed",
  "field": "name",
  "message": "Name is required"
}
```

The **Plain text example (status 200)** fenced block stays `OK`.

The options empty-state sentence becomes exactly:

`No custom headers. Content-Type: application/json is always added. Example: x-debug: true.`

That sentence is shown when the form has no header row. It is removed once a row exists, as it is today. The header name placeholder becomes exactly `x-debug`. The header value placeholder becomes exactly `true`. The existing name input’s accessible name is `Header name`, set with `aria-label="Header name"`. The existing value input’s accessible name is `Header value`, set with `aria-label="Header value"`. No other visible label is added beside those inputs. The visible section label stays `Response headers`. **New rule** and **Edit rule** are the same form: **Edit rule** shows that same sentence when it has no header row, and it shows those same placeholders and those same accessible names when a header row is added.

These controls already have test ids and keep them: `add-header`, `header-key`, `header-value`, `remove-header`. No new control is added, so no new `data-testid` is added.

Names that stay: user-facing **API Response Simulator**, package `api-response-simulator`, type `MockRule`, storage keys `rules` and `settings`, field `responseHeaders`, bridge source `__ninja_interceptor_bridge__`.

No new dependency. No new permission. The `package.json` dependency list is unchanged.

### Banned strings

The acceptance search is case-insensitive. Apply each pattern with the `i` flag. A hit is a match anywhere in a searched file.

| Pattern | What it catches | What it leaves alone |
|---|---|---|
| `(?<![A-Za-z0-9])keba(?![A-Za-z0-9])` | the employer token `keba` | `kebab` and `kebab-case` |
| `lockerconf` | the internal path token | nothing else in this repo |
| `(?<![A-Za-z0-9])locker(?![A-Za-z0-9])` | the whole word `locker` | `blocker`, and `lockerconf` is covered by the row above |
| `(?<![A-Za-z0-9])x-env(?![A-Za-z0-9])` | the header token `x-env` | a longer token such as `x-environment` |
| `(?<![A-Za-z0-9])feature[\s._-]?env(?![A-Za-z0-9])` | `feature env`, `feature-env`, `feature_env`, `feature.env`, `featureenv`, `featureEnv` | `feature environment` |
| `(?<![A-Za-z0-9])env[\s._-]?header(?![A-Za-z0-9])` | `Env Header`, `env-header`, `envHeader` | `Response headers` |
| `get timezone zone` | the retired example rule name | the word `timezone` in the vendored Playwright notes |

Do not search for the bare words `internal`, `staging`, `.local`, or `corp`.

Search every file under the repo root, including `dist/`, `docs/`, `specs/` other than this file, `e2e/` other than the file named below, `scripts/`, `public/`, `.cursor/`, `.github/`, `AGENTS.md`, `package.json`, `package-lock.json`, and the manifest.

Skip these:

- `specs/005-remove-all-private-references.md` (this file is the list)
- `e2e/private-references.spec.ts` (the test that encodes the list)
- directories `.git`, `node_modules`, `playwright-report/`, `test-results/`, `blob-report/`, and `playwright/.cache/`
- files whose name ends in `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.ico`

role-tester owns `e2e/private-references.spec.ts`. Dev does not create or edit it.

## Out of scope

A human decides these separately. Dev does not do them. This PR does not specify them as implementation work.

- Rewriting git history, including `git filter-repo`, a fresh repository, or a force-push. Older commits in this clone still contain the README example. Leave them.
- Changing git author config, or changing the author of past commits.
- Making the GitHub repository private or public.
- Editing other GitHub issues or pull requests.
- Changing the GitHub repository description or topics.
- Editing a Chrome Web Store listing, screenshots, support email, or privacy policy.
- Adding an author, a `repository` field, a `homepage` field, a manifest `homepage_url`, or a root `LICENSE`. `package.json` `author` is already empty. The manifest name and description are already generic. There is no root license file.
- Renaming the README title `API Mock Chrome Extension`. It is not an employer or internal-product identifier.
- Replacing other generic `localhost:8080` examples in the README pattern table, the orders example, the slow-list example, `AGENTS.md`, or the URL-pattern placeholder `localhost:8080/api/*`.
- Editing vendored skills to remove ordinary words (`kebab-case`, `blocker`, `staging`, `internal`, `.local`, `corp`).
- Stripping header names out of rules a person already saved in `chrome.storage`. Those values are not in the repo. An imported file that still contains an old example URL remains valid import data.
- A visual redesign of the popup or the options page.

## Assumptions

- This clone has no `x-env` string, no "Env Header" label, and no storage field that exists only for an environment header. `responseHeaders` is the generic list. It is not renamed, so there is no read-time migration and no old field to accept.
- The visible section name stays **Response headers**. "Header injection" would sound like request-header injection. This extension sets response headers on the mocked response and does not match or inject request headers. The generic example is `x-debug: true`, shown in the empty-state sentence, the placeholders, and the README. The two inputs stay visually unlabeled except for that section label and their placeholders. `aria-label` is how the name box stays `Header name` and the value box stays `Header value` after the placeholders become examples.
- The quick-start method changes from `POST` to `GET` so it matches a list of users. The export sample is already `GET`.
- `e2e/` fixtures already use `127.0.0.1:4173`, the rule name `Users`, and the header `X-Mock-Test`. They are not work hostnames, tokens, or work payloads. Dev does not edit them.
- `AGENTS.md`, `.cursor/rules/`, `package.json`, `public/manifest.json`, `docs/`, and specs `001` through `004` do not contain the banned patterns. Dev does not edit them unless a pattern from the table above is actually present.
- The public repo URL `https://github.com/SlobodanBogdanovic/APIResponseSimulator` stays. It is this project, not an employer identifier.
- This clone’s commit authors are a personal mailbox, the Cursor agent, and dependabot’s noreply address. No work email was found. Addresses are not written down here. That check does not authorize a history rewrite.
- A naive search for `keba` hits `kebab-case` in `.cursor/skills/skill-creator/scripts/quick_validate.py` and in the commits that added that skill. The pattern in the table does not treat `kebab` as a hit.
- `playwright-report/`, `test-results/`, `blob-report/`, and `playwright/.cache/` are gitignored. A failed search can quote an old README line inside an HTML report. Those directories are skipped so that quote is not a hit.

## Acceptance criteria

1. Given a reader opens `README.md`, when they read the quick-start table, then it has the columns Field, Example, and Notes, and the seven rows match the quick-start table in **Scope**. The cells are: Name `List users`, note `A label for yourself`; URL pattern `localhost:3000/api/v1/users`, note `See pattern syntax below. Host and port are an example.`; Method `GET`, note `Or ANY to match all methods` with `ANY` in backticks; status code `200`, note `Any HTTP status 100–599`; response body `[{"id": 1, "name": "Ada"}]`, note `Any text or JSON string`; response headers `x-debug: true`, note that `Content-Type: application/json` is always included, with that header name in backticks; delay `0`, note `Add artificial latency if needed`. Given they read the export sample, when they look at that one fenced JSON block, then `version` is `1`, `exportedAt` is `2026-04-25T12:00:00.000Z`, the rule `id` is `…`, `enabled` is true, `name` is `List users`, `method` is `GET`, `urlPattern` is `localhost:3000/api/v1/users`, `statusCode` is 200, `delayMs` is 0, and `createdAt` is 1714041600000. The decoded `responseBody` string is exactly `[{"id": 1, "name": "Ada"}]`. `responseHeaders` is an array of one object whose key is `x-debug` and whose value is `true`. Given they read **Response body tips**, when they look at the fenced blocks, then the **JSON example** block’s text is exactly `[{"id": 1, "name": "Ada"}]`, the **Error response example (status 422)** block is exactly the object with `error` `Validation failed`, `field` `name`, and `message` `Name is required`, and the **Plain text example (status 200)** block is `OK`. Given the same file, when it is searched, then it contains none of `lockerconf`, `Get timezone zone`, `datetime/zone`, `Europe/London`, or `Invalid timezone value`.

2. Given the options page is open on **New rule** and no header row has been added, when the user looks at the response headers section, then the visible label is `Response headers` and the empty text is exactly `No custom headers. Content-Type: application/json is always added. Example: x-debug: true.` Given **Edit rule** is open for a rule that has no custom headers, when the user looks at that same section, then the visible label and the empty text are the same. Given the user clicks **Add header** on **New rule**, and again on **Edit rule**, when the new row appears, then the name field’s placeholder is exactly `x-debug`, its accessible name is `Header name` from `aria-label="Header name"`, the value field’s placeholder is exactly `true`, and its accessible name is `Header value` from `aria-label="Header value"`. No new control and no new `data-testid` are added. Given that page, when its text is read, then it does not contain `Env Header` or `x-env`. The controls still expose `data-testid` values `add-header`, `header-key`, `header-value`, and `remove-header`.

3. Given the working tree and `dist/`, when each pattern in the **Banned strings** table is applied with the `i` flag to every searched file, then there are zero matches. The search uses the skip list in **Scope**. That skip list includes `specs/005-remove-all-private-references.md`, `e2e/private-references.spec.ts`, `.git`, `node_modules`, `playwright-report/`, `test-results/`, `blob-report/`, `playwright/.cache/`, and image files whose names end in `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.ico`. The search still includes `dist/`, `docs/`, the other specs, `e2e/` except `e2e/private-references.spec.ts`, `scripts/`, `public/`, `.cursor/`, `.github/`, `AGENTS.md`, `package.json`, `package-lock.json`, and the manifest. `specs/005-remove-all-private-references.md` and `e2e/private-references.spec.ts` are the only files allowed to contain those patterns.

4. Given `public/manifest.json`, when its `name` is read, then it is `API Response Simulator`. Given `package.json`, when its `name` and its dependency list are read, then the name is `api-response-simulator` and the dependency list is unchanged. Given `src/shared/types.ts`, when the rule type is read, then it still declares `MockRule` with `responseHeaders`. Given `src/shared/storage.ts`, when the storage helpers are read, then they still read and write the storage keys `rules` and `settings`. Given `src/content/bridge.ts` and `src/content/interceptor.ts`, when the bridge source is read, then both still use `__ninja_interceptor_bridge__`. Given a rule saved from the options form with a custom response header, when a matching `fetch` runs, then that response header is still returned, and the rule card still shows the rule name, method, status, and URL pattern. No dependency is added.

## Edge cases

- `kebab-case` and `blocker` are not hits. `chrome.storage.local`, `Internal server error`, `staging.example.com`, `host.docker.internal`, and the word `corporate` are not hits.
- The word `timezone` in vendored Playwright notes is not a hit. The phrase `Get timezone zone` is a hit.
- A rule a person already saved, including one whose header name is whatever they typed, still loads. The importer does not reject or rewrite a file because of its URL text.
- The options form still adds `Content-Type: application/json` on every mock response. The empty-state sentence still says that.
- A header row with an empty name is still dropped on save, as it is today.
- Rebuilding `dist/` without the README change still leaves `lockerconf` in `README.md`. Both the docs and `dist/` are in the same search.
- Image files under `public/icons/` and `dist/icons/` are not text and are not searched.
- A file under `playwright-report/`, `test-results/`, `blob-report/`, or `playwright/.cache/` is not searched. An HTML report that quotes an old README line is not a hit.
- On **Edit rule**, a rule that already has a custom header does not show the empty sentence. The row that is already there, and a row added with **Add header**, still uses the placeholders `x-debug` and `true` and the accessible names `Header name` and `Header value`.

## Coverage matrix

Filled by role-tester. Leave this table empty in the spec draft.

| Criterion | Test | Status |
|---|---|---|
| 1 | `1: README quick-start table uses the users example`; `1: README export sample is the List users rule`; `1: README response body tips use the users example and keep OK`; `1: README omits the retired timezone example` | pass |
| 2 | `2: New rule empty response headers text includes the x-debug example`; `2: New rule header fields use x-debug and true with accessible names`; `2: Edit rule with no headers shows the same empty response headers text`; `2: Edit rule with no headers uses the same header placeholders and accessible names`; `2: Edit rule with a saved header uses the same placeholders and hides the empty text` | pass |
| 3 | `3: banned private-reference patterns are absent from the working tree and dist` | pass |
| 4 | `e2e/rules.spec.ts` (`B4: creating a rule shows it on the options page`); `e2e/intercept.spec.ts` (`B7: matching fetch returns the mocked status, body, and custom response header only for that request`) | pass |

## Test notes

role-tester writes `e2e/private-references.spec.ts` only. Titles start with the criterion id (`1:`, `2:`, `3:`).

Criterion 1 can read `README.md` from disk. It fails before the README edit because the internal example is still there. Check the three quick-start columns, the one export sample, and the three tip blocks named in the criterion.

Criterion 2 uses the options page through the existing harness. Open **New rule**, read the empty-state sentence, click `add-header`, and read the placeholders and `aria-label` values on `header-key` and `header-value`. Open **Edit rule** for a rule with no custom headers and read the same sentence, then add a header row and read the same placeholders and accessible names. It fails before the copy edit because the placeholders are `Header name` and `Value` and the inputs have no `aria-label`. The extension under test is the built `dist/`, so a source edit that was not rebuilt still fails this check.

Criterion 3 is the file search in **Scope**, implemented in `e2e/private-references.spec.ts`. That file is skipped by its own search, so the patterns may appear there. The search also skips `.git`, `node_modules`, `playwright-report/`, `test-results/`, `blob-report/`, and `playwright/.cache/`. It fails before the README edit because `README.md` still matches.

Criterion 4’s fetch and rule card are already covered by `e2e/rules.spec.ts` (`B4: creating a rule shows it on the options page`) and `e2e/intercept.spec.ts` (`B7: matching fetch returns the mocked status, body, and custom response header only for that request`). Do not add a new intercept test for criterion 4. A new test that only saves `x-debug` and expects the mocked response would pass before this change, because any response header already works. The manifest name, package name, dependency list, `MockRule`, `responseHeaders`, storage keys `rules` and `settings`, and bridge source `__ninja_interceptor_bridge__` are read from `public/manifest.json`, `package.json`, `src/shared/types.ts`, `src/shared/storage.ts`, `src/content/bridge.ts`, and `src/content/interceptor.ts`. Those files already say that, and this change does not edit them, so do not add a test that only reads them. In the coverage matrix, point criterion 4 at those two existing tests.

Page for a later manual look: `options`, **New rule** and **Edit rule**, fields **Response headers**, `header-key`, and `header-value`. The README check is the file, not a page.

## QA review

Requirements review, round 2 of 2. Round 1 was **NEEDS CHANGES** with six Medium findings and no High findings. Each earlier finding is marked on its rank line. QA did not mark acceptance criteria and did not write **Manual verification steps**.

**Verdict:** APPROVE

**Biggest risk:** A reader can still take this change as making the project safe to share. The working tree after this change is a users example plus the rebuilt options page. A clone’s older commits still contain `lockerconf` and `Get timezone zone`. Issue 22 also asks for a clean history, clean issues and pull requests, and a clean store listing. This spec leaves those to a later human decision, and it now says so.

**Findings:**

1. [Med] resolved. The user is now the reader of the current README and the person adding a response header. That opening says older commits, GitHub issues, the repository description, and the store listing are the separate decisions in **Out of scope**. **Expected user outcome** says this change cleans the current working tree and the rebuilt `dist/`, and that older commits still contain the previous quick-start example.
   Suggested rewrite: none. The requested wording is already in **Who is the user and what problem do they have** and **Expected user outcome**.

2. [Med] resolved. **Scope** keeps the three columns Field, Example, and Notes, including the `Content-Type: application/json` note and the sentence that the host and port are an example. Criterion 1 requires those same cells.
   Suggested rewrite: none. The requested table is already in **Scope**, and criterion 1 points at it.

3. [Med] resolved. The empty sentence stays `No custom headers. Content-Type: application/json is always added. Example: x-debug: true.` The placeholders are `x-debug` and `true`, with `aria-label="Header name"` and `aria-label="Header value"`. No new control and no new `data-testid` are added. The visible label stays `Response headers`. **Edit rule** is required to show the same sentence, placeholders, and accessible names.
   Suggested rewrite: none. That wording is already in **Scope**, criterion 2, and the **Edit rule** edge case.

4. [Med] resolved. **Scope** shows one export sample and the two changed tip blocks. The decoded `responseBody` is exactly `[{"id": 1, "name": "Ada"}]`. The status-422 block names `error`, `field`, and `message`. Criterion 1 requires the same export fields, including `id`, `enabled`, `statusCode`, `delayMs`, and `createdAt`, and the same tip text. The plain-text tip stays `OK`.
   Suggested rewrite: none. The requested sample and tip blocks are already in **Scope** and criterion 1.

5. [Med] resolved. Criterion 4 reads the extension name from `public/manifest.json`, the package name and the dependency list from `package.json`, `MockRule` and `responseHeaders` from `src/shared/types.ts`, the storage keys `rules` and `settings` from `src/shared/storage.ts`, and `__ninja_interceptor_bridge__` from `src/content/bridge.ts` and `src/content/interceptor.ts`. The saved-header `fetch` and the rule card stay in that same criterion.
   Suggested rewrite: none. Criterion 4 already names those files.

6. [Med] resolved. The **Scope** skip list, criterion 3, the test notes, and the edge cases skip `playwright-report/`, `test-results/`, `blob-report/`, and `playwright/.cache/` along with `.git` and `node_modules`. The search still includes `dist/`, `docs/`, the other specs, `e2e/` except `e2e/private-references.spec.ts`, `scripts/`, `public/`, `.cursor/`, `.github/`, `AGENTS.md`, `package.json`, `package-lock.json`, and the manifest.
   Suggested rewrite: none. Those directories are already on the skip list.

7. [Low] **Expected user outcome** says a search of the project files and of `dist/` finds none of the listed identifiers. Criterion 3 then allows `specs/005-remove-all-private-references.md` and `e2e/private-references.spec.ts` to contain them, and it skips both. A person who greps the cleaned tree without that skip list still finds `lockerconf` and `Get timezone zone` in those two files. The acceptance criterion is the precise rule. The outcome sentence promises a cleaner grep than the criterion allows.
   Suggested rewrite: In **Expected user outcome**, replace the search sentence with: A search of the project files and of `dist/`, using the skip list in **Scope**, finds none of the employer, product, or internal-infrastructure identifiers listed in this spec. This spec and `e2e/private-references.spec.ts` still contain those identifiers, because they are the list and the test.

Checked against the tree: with this spec, `.git`, `node_modules`, `playwright-report/`, `test-results/`, `blob-report/`, `playwright/.cache/`, and images left out, the seven banned patterns match `README.md` and nothing else. The hits there are `lockerconf` (quick-start row and export sample) and `Get timezone zone` (the same two places). `kebab-case` and `blocker` do not match. `Europe/London`, `datetime/zone`, and `Invalid timezone value` appear in `README.md` and in this spec, not in `src/` or `dist/`. `package.json` `author` is empty. The manifest name is `API Response Simulator` and it has no `homepage_url`. `src/` has no `x-env` string and no Env Header label. The current header placeholders in `src/options/components/RuleForm.tsx` are `Header name` and `Value`, and those inputs have no `aria-label`. The button that adds a row is labeled `+ Add header` and its test id is `add-header`. The form headings are `New rule` and `Edit rule`. `src/shared/types.ts` declares `MockRule` with `responseHeaders`. `src/shared/storage.ts` reads and writes `rules` and `settings`. Both bridge files use `__ninja_interceptor_bridge__`. `e2e/rules.spec.ts` has `B4: creating a rule shows it on the options page`. `e2e/intercept.spec.ts` has `B7: matching fetch returns the mocked status, body, and custom response header only for that request`. The header helper in `e2e/extension.ts` uses `header-row`.

Unchecked: the options page in a browser, lint, typecheck, build, and tests. Commit messages and author addresses were not listed, so the assumption that history has no work email was not checked. GitHub issues and pull requests other than issue 22 were not read. Issue 22’s body still asks for history, issues, and the store listing; its only comment was not re-read in this round. The Chrome Web Store listing was not opened. A full `git log -p` search for the old example was not run.

## Manual verification steps

Filled by role-tester after implementation. About five minutes. Load the unpacked extension from `dist/`. The README check is the file.

1. Open `README.md` at the quick-start table, the export sample, and **Response body tips**. — Expected: the table columns are Field, Example, and Notes. The example cells are `List users`, `localhost:3000/api/v1/users`, `GET`, `200`, `[{"id": 1, "name": "Ada"}]`, `x-debug: true`, and `0`. The URL-pattern note says the host and port are an example. The export sample and the JSON tip use that same users body. The status-422 tip says `Validation failed`, field `name`, message `Name is required`. The plain-text tip is `OK`. The file does not show `lockerconf`, `Get timezone zone`, `datetime/zone`, `Europe/London`, or `Invalid timezone value`.

2. Open the options page and click **Add rule**. Look at **Response headers** before adding a row. — Expected: the heading is **New rule**. The section label is `Response headers`. The empty line is exactly `No custom headers. Content-Type: application/json is always added. Example: x-debug: true.` It is small, gray, and italic, with the same spacing as the other helper lines. No extra control sits beside **+ Add header**.

3. Click **+ Add header**. — Expected: the empty line disappears. The name box placeholder is `x-debug` and the value box placeholder is `true`. No new visible label is painted beside those boxes. The row, the gray placeholder color, and the remove button keep the current spacing. In the accessibility tree the name box is `Header name` and the value box is `Header value`.

4. Cancel, add a rule named `Users` with no custom headers, and click **Edit**. — Expected: the heading is **Edit rule**, the section label is `Response headers`, and the empty line is the same sentence as in step 2, in the same gray italic style. Click **+ Add header**. Expected: the placeholders are `x-debug` and `true`, and the accessible names are `Header name` and `Header value`.

5. Edit a rule that already has one custom header, then click **+ Add header**. Look at that rule’s card. — Expected: the empty sentence stays hidden. The saved row and the new row both show placeholders `x-debug` and `true`. The card still shows the rule name, method, status, and URL pattern. The toolbar icon artwork is unchanged.

6. On the options page, with at least one rule, click **Export**, then click **Import** and choose that file. Watch the status line. — Expected: a green status line appears for the export, and a green status line appears for the import. Each line disappears on its own after about three seconds. Spacing and color of that line are unchanged.

## Definition of done

- [ ] Spec accepted by the human
- [ ] A QA requirements review was completed; findings accepted or spec updated
- [ ] DEV implemented the spec without changing the acceptance criteria
- [ ] role-tester acceptance check completed; findings addressed by DEV
- [ ] Human ran the Manual verification steps
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` were run and the output is in the PR
- [ ] Human reviewed and merged the PR
- [ ] A row was added to `docs/agent-runs.csv`
