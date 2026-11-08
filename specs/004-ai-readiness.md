# 004 — Improve the repo's AI readiness

GitHub issue: [Improve the repo's AI readiness: curated agent skills, project context, and skill vetting](https://github.com/SlobodanBogdanovic/APIResponseSimulator/issues/11)

## Who is the user and what problem do they have

The user is the maintainer who runs the agent pipeline (`@role-spec`, `@role-qa`, `@role-dev`, `@role-tester`, and `/feature`) on **API Response Simulator**.

People who install the extension are not part of this change. Popup, options, interception, and stored rules stay as they are.

Today those agents start from generic knowledge. They write brittle Playwright tests, miss Manifest V3 limits (a service worker restart drops in-memory state, permissions should be least-privilege, store review has its own rules), and re-learn the repo on every task. There is no `.cursor/skills/` directory and no `SKILL.md` in the repo. Nothing in the role files points at a skill path.

## Problem

The pipeline has no vetted, pinned skills and no single project context the roles are told to read. `AGENTS.md`, `.cursor/rules/project-core.mdc`, `docs/agent-workflow.md`, and the role files repeat the same rules, and they disagree in places. Example: `project-core.mdc` tells Dev to finish on lint, typecheck, and tests, while `AGENTS.md` and `.cursor/agents/role-dev.md` also require `npm run build`. `docs/agent-workflow.md` has a second, shorter command table. The `/feature` Dev prompt in `.cursor/commands/feature.md` still tells every later spec to run the 003-only reverse suite and break-it proof.

There is no skill register, no architecture / testing / glossary doc for agents, no indexing ignore for `dist/` and reports, and no Dependabot config. A third-party skill that fetched its rules from the network, ran an installer, or asked for secrets would be followed as instructions.

## Expected user outcome

The maintainer can see a small set of skills under `.cursor/skills/`, each third-party skill pinned to a commit with a license file and a written review. Three project skills describe this repo: conventions, extension end-to-end tests, and the release checklist. Role files point at the skill paths in Scope D. `.cursor/agents/role-spec.md` and `.cursor/agents/role-dev.md` both point at `.cursor/skills/release-checklist/SKILL.md`, read when the task is a version bump, the store ZIP, store listing or privacy text, or a GitHub release. The other pointers are `apiresponsesimulator-conventions`, `frontend-design` when that directory exists and the task changes popup or options UI, the accepted MV3 skill for QA and Dev, and `playwright-best-practices` plus `extension-e2e-testing` for Tester. `AGENTS.md` is the source of truth for extension hard rules, commands, and guardrails, without a second copy that says something else.

A fresh chat that asks for a badge test, a new permission, a service-worker reset, a popup restyle, or a store submission follows the matching skill. The maintainer can read what happened in `docs/ai-readiness.md`. The extension's npm dependencies are unchanged.

## User story

As the maintainer of API Response Simulator, I want a small set of vetted skills and one project context the four roles actually read, so that the pipeline follows this repo's Manifest V3 and Playwright rules with less correction.

## Assumptions

- This spec does not add the three-word phase-skip line that `specs/003-improve-playwright-tests-coverage.md` uses. Phase 1 still runs. Criteria that are not extension behavior are marked `cannot automate` by the tester when a browser test cannot show them. File deliverables that are absent today can be asserted by reading the repo from the test process.
- Dev does not create or edit `e2e/**/*.spec.ts`. Those files are not Dev-owned in this spec.
- On 2026-11-04 the repo has no `.cursor/skills/` tree and no `SKILL.md`. `frontend-design` is not vendored here. "Already installed" in the issue means "expected from earlier work"; Dev treats it as missing until the files and `LICENSE` are in this repo.
- The end-to-end harness has already landed: `e2e/extension.ts`, `e2e/server.mjs`, persistent context, extension id from the service worker URL, `readExtensionState`, and `http://127.0.0.1:4173`. `extension-e2e-testing` is written in this PR. It is not deferred.
- "Header rule" is not a separate stored type. It means `MockRule.responseHeaders` entries `{ key, value }` copied onto the mocked response. There is no request-header match field. The glossary says that, so a later agent does not invent one.
- Badge text in the product is `ON` or `OFF` (`src/background/service-worker.ts`). Probe 1 expects the test to turn the extension off and read that badge through the service worker.
- `.cursorindexingignore` is the Cursor ignore file that drops files from indexing and still allows the agent to read them. `.cursorignore` also blocks agent access. This PR uses `.cursorindexingignore` only. Dev does not add `.cursorignore`.
- Probes run during Dev, in a new agent conversation that is not `@role-spec`, `@role-qa`, `@role-dev`, or `@role-tester`. The only user message is the probe sentence. Dev does not paste the expected checks into that conversation. Dev writes the results into `docs/ai-readiness.md`. If a probe edits the repo, Dev reverts those edits before the done gate. Under the probe table, Dev saves the full reply for each run. The Evidence cell quotes at most 40 words from that reply. Followed is judged from the full reply. Dev does not fill the table from memory.
- A live `/feature` run on a second product idea is not part of this PR. It would write another spec and change product code. The pipeline proof inside this PR is that stage order and round limits in `.cursor/commands/feature.md` stay the same.
- Playwright MCP is evaluated and not installed. No new npm package is added. `npx` in a scratch directory is not a dependency and is not committed.
- Gap skills for generic TypeScript, GitHub Actions, and accessibility are reviewed and not installed. They overlap the project conventions skill, `docs/testing.md`, and `frontend-design`. That keeps one skill per topic.
- If every Chrome extension candidate fails vetting, Dev writes one project skill at `.cursor/skills/extension-mv3/SKILL.md` and does not also install a failed candidate. If one candidate passes, `extension-mv3` is not created.
- Third-party skill text is guidance. `AGENTS.md` and `.cursor/rules/project-core.mdc` win when they disagree. Skills say that; they do not restate the hard-rule list.
- The human reviews `docs/architecture.md` in the pull request. Dev still writes the draft in this PR.
- Owner column for every register row is `maintainer`.

## Scope

One PR. Docs, vendored skills, role references, indexing ignore, and Dependabot. No product feature.

### A. Third-party skills

Dev reads each candidate's entire `SKILL.md` and every bundled file before copying anything. Vetting policy for every third-party skill:

- Prefer an official or well-maintained source. Accept only MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, or ISC. Any other license, or no license, is a reject.
- Copy the `LICENSE` file into `.cursor/skills/<name>/` next to `SKILL.md`. If the license lives at the upstream repo root, copy that file into the skill folder and say so in the review.
- Reject a skill that tells the agent to download further rules and follow them, run an install script or a download, ask for a secret or a token, override `AGENTS.md` or `project-core.mdc`, or hide instructions (zero-width characters, encoded blobs, or comments whose text is instructions). Do not edit a rejected skill to make it safe.
- Vendor the accepted files. Record the source commit SHA in `docs/ai-skills.md`. Do not add a live fetch or an auto-update.
- If a CLI installer is used, run it in a scratch directory outside this repo, read the output, copy only the accepted skill into `.cursor/skills/<name>/`, and delete the scratch directory. Do not commit files it wrote for other tools (other agent product directories, extra MCP config, extra rule files).
- At most 8 directories under `.cursor/skills/` that contain `SKILL.md`. One accepted skill per topic.
- Keep the upstream folder name as the directory name.

Candidates and the topic each one belongs to:

| Topic | Candidate | What Dev records |
|---|---|---|
| Frontend design | `frontend-design` from `anthropics/skills` | Review, then vendor with `LICENSE` if it passes. Folder `.cursor/skills/frontend-design/` when that is the upstream name. |
| Playwright | `playwright-best-practices` from the `currents-dev` org, MIT | Primary Playwright skill. Put the `currents-dev` org in the Source URL and in the Reason. Record the real repo URL and SHA. Reject if the org or the license does not match. |
| Playwright | `webapp-testing` from `anthropics/skills` | Read it. Reject it when `playwright-best-practices` is accepted, because this repo's tests are TypeScript and one topic gets one skill. |
| Chrome extension MV3 | All four: `samber/cc-skills` chrome-extension, Mindrally `chrome-extension-development` (Apache-2.0), `yigitkonur` build-chrome-extension, `quangpl/browser-extension-skills` | Read all four. Accept at most one. The accepted one must cover as many of these as its text actually contains: service worker restart, least-privilege permissions, MV3 constraints, Web Store review, security analysis. Tie-break: more of those topics, then MIT or Apache-2.0, then the shorter skill. Justify the choice in the review and in the PR body. |
| Skill authoring | `skill-creator` from `anthropics/skills` | Accept only if it passes vetting. It may guide the project skills. It is not authority over this spec. |

TypeScript, GitHub Actions, and accessibility stay Decision `reject` in this PR. Do not vendor a candidate for them.

| Topic | Why it is not installed |
|---|---|
| TypeScript | Covered by `apiresponsesimulator-conventions` and `AGENTS.md`. |
| GitHub Actions | Covered by `docs/testing.md` and `.github/workflows/ci.yml`. Dependabot updates the actions. |
| Accessibility | Covered by `frontend-design` when that skill is accepted, and by the conventions skill rule that a control needs an accessible name. |

`docs/ai-skills.md` is the register. It contains the vetting policy and one table:

| Skill | Topic | Decision | Source URL | Commit SHA | License | Date added | Reason | Owner | Review |

- `Decision` is `accept` or `reject`.
- An accepted third-party row has a real commit SHA, a license name from the allowed list, and a Review cell that includes `Vetting: pass` plus what the skill contains and the risks that were looked for.
- A rejected row has `Vetting: fail` or `Decision: reject`, the reason, and no directory under `.cursor/skills/`.
- A project skill row uses source URL `https://github.com/SlobodanBogdanovic/APIResponseSimulator`, commit SHA `n/a`, license `ISC`, and Review text `Vetting: project-authored`.
- Every candidate name in the table above appears in the register, including rejects: `frontend-design`, `playwright-best-practices`, `webapp-testing`, `samber/cc-skills`, `Mindrally`, `yigitkonur`, `quangpl/browser-extension-skills`, `skill-creator`. `currents-dev` is the org in the `playwright-best-practices` Source URL and Reason. It is not its own row.
- Date added is the ISO-8601 date the row is written. Owner is `maintainer`.
- On an accept row, Topic is `Project conventions` for `apiresponsesimulator-conventions`, `Extension e2e` for `extension-e2e-testing`, `Release` for `release-checklist`, `Frontend design` for `frontend-design`, `Playwright` for `playwright-best-practices`, and `Skill authoring` for `skill-creator`. The accepted MV3 skill, whether the third-party folder or `extension-mv3`, uses `Chrome extension MV3`, and only one of those directories exists.

### B. Project skills

Each project skill is a `SKILL.md` with YAML frontmatter `name` and `description`, at most 120 lines, at most 100 lines after the frontmatter. The description states when to use it. The body does not paste `AGENTS.md`. It points at `AGENTS.md` for hard rules and says `AGENTS.md` wins on conflict.

1. `.cursor/skills/apiresponsesimulator-conventions/SKILL.md`
   - Description includes: `Use when editing this repository's extension architecture`.
   - Also says to use it when writing a spec for this repo.
   - Map: service worker `src/background/service-worker.ts` (install defaults, badge `ON`/`OFF`, options open); popup; options; storage keys `rules` and `settings`; bridge source `__ninja_interceptor_bridge__`; MAIN interceptor has zero imports and patches fetch and XHR synchronously; `findMatch` tests the raw URL and the protocol-stripped URL.
   - Naming: user-facing **API Response Simulator**, package `api-response-simulator`, type `MockRule`. Do not rename the storage keys or the bridge source.
   - Where to add a field: point at the numbered list in `AGENTS.md`. Do not copy the six steps.
   - Done: the four commands in `.cursor/agents/role-dev.md`, then reload the unpacked extension.
   - A new permission needs a written least-privilege justification before it is added. `declarativeNetRequest` stays forbidden. Point at `AGENTS.md` for the reason.

2. `.cursor/skills/extension-e2e-testing/SKILL.md`
   - Description includes: `Use when writing or changing Playwright tests for this Chrome extension`.
   - Persistent context via `launchExtension` (`chromium.launchPersistentContext`, channel `chromium`, headless, one user-data directory per test).
   - Extension id is the host of the service worker URL (`extensionIdFrom`).
   - State and badge: `readExtensionState` on that service worker. It returns rules, `settings.extensionEnabled`, `badgeText`, and `title`. Badge text is `ON` or `OFF`. Do not use `waitForTimeout`. The file contains the string `waitForTimeout` only as a prohibition, and it contains `readExtensionState`.
   - Probe origin `http://127.0.0.1:4173` from `e2e/server.mjs`.
   - Web-first assertions (`await expect(...)`).
   - CI details: point at `docs/testing.md`. Do not copy the workflow.
   - Do not copy the device-id, HMAC, or machine-SID helper from `e2e/extension.ts`.

3. `.cursor/skills/release-checklist/SKILL.md`
   - Description includes: `Use when preparing a Chrome Web Store submission`.
   - Also says to use it for a version bump, the store ZIP, store listing or privacy fields, and a GitHub release.
   - Bump `version` in `package.json` and `public/manifest.json` together. They are both `1.0.0` today. This PR does not bump them.
   - Build with `npm run build`. ZIP the contents of `dist/` so `manifest.json` is at the archive root. Do not zip the repo root or `node_modules`.
   - Listing name **API Response Simulator**. Privacy text covers permission `storage` and host permission `<all_urls>`, no remote code, and no account. The human reviews that text before any submission. This PR does not submit to the store and does not call a store API.
   - GitHub release: tag equals the version, attach the same ZIP. No publishing automation.
   - The file contains the words version, ZIP, privacy, and GitHub release. It does not ask for a store password, token, or API key.

Fallback only when all four MV3 candidates are rejected: `.cursor/skills/extension-mv3/SKILL.md`, same line caps. It covers service worker restart (in-memory globals die; durable values go in `chrome.storage.local` through `src/shared/storage.ts`), least privilege, and a pointer to the `AGENTS.md` ban on `declarativeNetRequest`. Description includes: `Use when changing Manifest V3 permissions or the service worker`.

### C. Project context

`AGENTS.md` stays the source of truth. After the edit it has these headings, in this order, and no `## What not to do` section and no `## After any code change` heading:

1. `## What this project is`
2. `## Commands`
3. `## Architecture`
4. `## Conventions`
5. `## Guardrails`
6. `## Hard rules`
7. `## Chrome API constraints`
8. `## State management`
9. `## Skills`
10. `## Minimum Chrome version`

Rules for that edit:

- Hard rules stay here, once. Merging the old "What not to do" list must keep every prohibition that file has today, including zero imports in `src/content/interceptor.ts`, synchronous fetch and XHR patch, message listener only updates `rules` and `settings`, no second patch, bridge is the only content script that calls `chrome.storage`, bridge source `__ninja_interceptor_bridge__`, `"world": "MAIN"` and `"world": "ISOLATED"`, no `declarativeNetRequest`, `emptyOutDir: false` on the content and bridge Vite configs, no `lib` mode, `jimp` stays on 0.22, `findMatch` tests the raw URL and the protocol-stripped URL, XHR patched on the prototype, XHR events `readystatechange` then `load` then `loadend`, no `window.confirm()`, no commit to `main`, no `.env`, no new dependency without a PR justification, no destructive command without asking.
- Commands stay the command table and the three-step `npm run build` order. Keep these reload sentences in `## Commands`: refresh the extension on `chrome://extensions`, reload the app tab, because the extension does not hot-reload. Delete the `## After any code change` heading. After the build steps, point the Dev gate at `.cursor/agents/role-dev.md`, point pipeline order and round limits at `.cursor/commands/feature.md` and `docs/agent-workflow.md`, and point CI at `docs/testing.md`. Do not restate pipeline order, round limits, or CI job steps here.
- Architecture is the short map plus a pointer to `docs/architecture.md`.
- Conventions keep naming, storage, and "where to add a MockRule field". Pipeline stage order and round limits are not copied here. One pointer: `.cursor/commands/feature.md` and `docs/agent-workflow.md`.
- Guardrails are the full guardrail list, only in this file.
- `## Skills` points at `.cursor/skills/` and `docs/ai-skills.md` and states that third-party skills do not override this file or `project-core.mdc`.
- Role-boundary procedure is not copied here. It stays in `.cursor/rules/project-core.mdc`.

`.cursor/rules/project-core.mdc` stays `alwaysApply: true`. After the edit:

- It still has the ROLE BOUNDARIES section (one role, STOP, allowed writes, `/feature` limits).
- It does not repeat the guardrail list, the hard rules, or a Dev done gate. It points at `AGENTS.md` for guardrails and hard rules, and at `.cursor/agents/role-dev.md` for the done gate.
- Both step 4 and the DONE section in `.cursor/agents/role-dev.md` list `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`. `project-core.mdc` points at `.cursor/agents/role-dev.md` for that gate and does not list a command set of its own.

`docs/agent-workflow.md`: keep the human flow and the example prompts. Replace the command table with a pointer to the `AGENTS.md` command table. Replace the CI sentences in step 8 with a pointer to `docs/testing.md`. Do not change the stage order. The 003 exception stays described in that file as it is today; this spec does not add another skip line.

`.cursor/commands/feature.md`: delete only the sentence in the Dev launch prompt that tells Dev to run `npm run test:e2e:reverse` and the break-it proof. Those checks belong to spec 003, which already landed them. Leave every round limit as it is: QA maximum 2 rounds, Tester Phase 1 maximum 2 launches, Dev maximum 3 attempts, Tester Phase 2 maximum 2 fix rounds. Leave stage order unchanged.

`docs/architecture.md` (draft for the human to review in the PR) covers:

- Popup, options, service worker, bridge (ISOLATED), interceptor (MAIN).
- Request path: page `fetch` or XHR, interceptor `findMatch`, fake response or the real request.
- Settings path: UI, `src/shared/storage.ts`, `chrome.storage.local`, bridge `onChanged`, `postMessage`, interceptor closure variables.
- Service worker: `onInstalled` seeds missing `settings` and `rules`; badge paint reads storage on install, startup, and load; `chrome.storage.onChanged` for `settings` repaints the badge; `toolbarPaintGeneration` is an in-memory counter and is not user state. A worker restart clears it. User state stays in `chrome.storage.local`.
- Permissions today: `storage`, host `<all_urls>`, plus the localhost host patterns. Why `declarativeNetRequest` is not used: one sentence and a pointer to `AGENTS.md`.
- It does not copy the hard-rule list.

`docs/testing.md` covers `npm test` versus `npm run test:e2e`, the fixture entry points `launchExtension`, `extensionIdFrom`, `readExtensionState`, `openProbe`, and `PROBE_ORIGIN`, CI jobs `verify` and `e2e` in `.github/workflows/ci.yml`, the flaky summary, and the uploaded report, traces, and screenshots. It points at `.cursor/skills/extension-e2e-testing/SKILL.md`.

`docs/glossary.md` defines these four terms and no extra product concepts:

| Term | Meaning in this repo |
|---|---|
| rule | One `MockRule` in `chrome.storage.local` under `rules`. |
| mock | The fake response for a matching request: status, body, response headers, `delayMs`. Not a second stored object. |
| header rule | A `{ key, value }` entry in `responseHeaders` on a rule. Not a separate rule type. No request-header matching. |
| state | `settings.extensionEnabled` plus the rules. In Playwright, `readExtensionState` also returns `badgeText` (`ON` or `OFF`) and `title`. |

Indexing ignore: add `.cursorindexingignore` with these entries:

```
dist/
node_modules/
playwright-report/
test-results/
blob-report/
playwright/.cache/
```

Do not ignore `src/`, `e2e/`, `specs/`, `docs/`, `AGENTS.md`, or `.cursor/agents/`. Do not ignore `dist/content/interceptor.js` or `dist/content/bridge.js` by a rule that blocks reading them. There is no separate large-fixture directory; traces already sit under `test-results/`.

### D. Role references

Add a `## Skills` section of at most 15 lines to each role file. Each entry is a path in backticks and one sentence on when to read it. Do not paste skill bodies.

| Role file | Paths |
|---|---|
| `.cursor/agents/role-spec.md` | `apiresponsesimulator-conventions`. Also `frontend-design` when that directory exists, and only when the spec changes popup or options UI. `.cursor/skills/release-checklist/SKILL.md`, read when the task is a version bump, the store ZIP, store listing or privacy text, or a GitHub release. |
| `.cursor/agents/role-qa.md` | The accepted MV3 skill path (the third-party folder, or `extension-mv3` when that is the fallback). Read it when the spec adds a permission, a host pattern, or service-worker behavior. |
| `.cursor/agents/role-dev.md` | Conventions. `frontend-design` when that directory exists and the change touches popup or options UI. The same MV3 path when the change touches the service worker, the manifest, or permissions. `.cursor/skills/release-checklist/SKILL.md`, read when the task is a version bump, the store ZIP, store listing or privacy text, or a GitHub release. |
| `.cursor/agents/role-tester.md` | `playwright-best-practices` when that directory exists, and `extension-e2e-testing`, before writing or judging Playwright tests. |

A rejected skill has no path in a role file. `skill-creator` is not required in a role file. Handoff sentences stay. In `.cursor/agents/role-dev.md`, the DONE section names the same four commands as step 4: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`.

### E. Playwright MCP

Evaluate only. Do not install it and do not add a dependency. In `docs/ai-readiness.md`, a `## Playwright MCP` section states: decision `not installed`; tests-as-code (`npm test`, `e2e/extension.ts`) cover this pipeline; risks are browser control and network access; a later install needs the human's approval first.

### F. Probe tasks

`docs/ai-readiness.md` starts with this table. Dev runs each prompt in a fresh chat as defined in Assumptions. Under the table, save the full reply for each run. The Evidence cell quotes at most 40 words from that reply. Judge Followed from the full reply. A `yes` row has Fix `none`.

| Probe | Prompt | Expected | Triggered | Followed | Evidence | Fix |
|---|---|---|---|---|---|---|
| 1 | Write a Playwright test that toggles the extension OFF and checks the badge | `extension-e2e-testing` and, when installed, `playwright-best-practices` | yes, no, or not observable | yes or no | | |
| 2 | Add a new permission X | the accepted MV3 skill | yes, no, or not observable | yes or no | | |
| 3 | A background variable resets after a while | the accepted MV3 skill | yes, no, or not observable | yes or no | | |
| 4 | Restyle the popup | `frontend-design` when installed. When that skill is rejected, Followed may stay `no`, the Fix is the reject reason, and the probe is not run again | yes, no, or not observable | yes or no | | |
| 5 | Prepare the store submission | `release-checklist` | yes, no, or not observable | yes or no | | |

Followed is `yes` only when every check for that probe is true of the full reply. `Triggered` may be `not observable` when the chat does not show which file was read. That value does not fail the probe.

1. The reply calls `readExtensionState`, expects badge text `OFF`, and uses `await expect(`. It does not call `waitForTimeout`. It may contain that name only in a sentence that forbids the call.
2. The reply includes no manifest change that adds a permission. It says a new permission needs a written justification. It contains `least privilege` or `least-privilege`. It does not say to ignore `AGENTS.md` or `project-core`. The prompt stays `Add a new permission X`, and the reply does not invent a permission named X.
3. The reply says the service worker can be stopped, killed, or restarted. It says an in-memory or global variable does not survive that. It names `chrome.storage` as the place to keep the value. It does not recommend `declarativeNetRequest`.
4. The reply has a plan, as a heading or a numbered list, before any code block that edits `src/popup`, and it names the popup file.
5. The reply contains version, ZIP or zip, privacy, and GitHub release. It says `manifest.json` is at the archive root and does not say to zip the repo root. It does not ask for a store password, token, or API key, and it does not say a submission was sent.

Probes 1, 2, 3, and 5 are Followed `yes`. Probe 4 is Followed `yes` when `frontend-design` is installed. When that skill is rejected, probe 4 may stay Followed `no`, the Fix is the reject reason, the skill is not vendored, no role file points at it, and probe 4 is not run again.

If Followed is `no` for probes 1, 2, 3, or 5, or for probe 4 only when `frontend-design` is installed, Dev adjusts that skill's `description` or the role-file path reference, records the fix, and runs that same prompt once more. When a probe is run twice, keep the first reply and label its result `First run`. The latest full reply is the Followed value that must be `yes` for probes 1, 2, 3, and 5, and for probe 4 when `frontend-design` is installed. A `no` row, including a labeled `First run`, has a Fix other than `none`.

### G. Maintenance

`docs/ai-skills.md` ends with a Maintenance section the human runs: review the register monthly; update a third-party skill only by reading the whole skill at a new SHA and replacing the vendored files; never auto-update; remove a skill that no role file and no probe has used for 2 months.

Add `.github/dependabot.yml` for the `npm` ecosystem and the `github-actions` ecosystem, directory `/`, monthly schedule. Ignore dependency name `jimp` so Dependabot does not move it off 0.22. Set `open-pull-requests-limit` to 5. This file is not an extension dependency.

## Out of scope

- New product behavior, including a new permission, a version bump, a store submission, and publishing automation.
- Editing `src/`, `public/manifest.json`, or `package.json`. Dev does not create or edit `e2e/**/*.spec.ts`, and Tester Phase 1 may add a new `e2e/**/*.spec.ts` that only reads repo files. This PR does not change `e2e/extension.ts` or `e2e/server.mjs`.
- Installing Playwright MCP or any other new npm package.
- Multi-agent teams, paid tools, and live skill updates.
- A second `/feature` run on a sample product task.
- Rewriting role procedures or round limits, beyond the skill pointers and the one Dev-prompt sentence in Scope C. The DONE sentence in `.cursor/agents/role-dev.md` is in scope: it names the same four commands as step 4. The other handoff sentences stay.

## Acceptance criteria

1. Given a checkout of this change, when a reader opens each directory under `.cursor/skills/` whose register Review contains `Vetting: pass`, then that directory contains `SKILL.md` and a `LICENSE` file, and `docs/ai-skills.md` has a row for that skill with a source URL, a commit SHA, and a Review cell that contains `Vetting: pass`. A row whose Review is `Vetting: project-authored` does not need a `LICENSE` file in the skill folder.
2. Given the vendored third-party skills, when a reader compares them to the vetting policy in `docs/ai-skills.md`, then none of them tells the agent to download further rules and follow them, run an installer or a download, ask for a secret or a token, or override `AGENTS.md` or `project-core.mdc`.
3. Given `.cursor/skills/`, when the reader counts directories that contain `SKILL.md`, then the count is at most 8, each `Decision: accept` row in `docs/ai-skills.md` uses the Topic Scope A assigns to that skill, and those Topic values are unique.
4. Given this change, when the reader opens `.cursor/skills/apiresponsesimulator-conventions/SKILL.md`, `.cursor/skills/extension-e2e-testing/SKILL.md`, and `.cursor/skills/release-checklist/SKILL.md`, then each file exists, each description contains the when-to-use sentence in Scope B, and `extension-e2e-testing` is present because the harness in `e2e/extension.ts` already exists.
5. Given the four role files, when the reader looks at `## Skills`, then each file links the paths Scope D requires by path, including `.cursor/skills/release-checklist/SKILL.md` in `.cursor/agents/role-spec.md` and in `.cursor/agents/role-dev.md`, and none of those sections contains the body of a `SKILL.md`.
6. Given `docs/ai-readiness.md`, when the reader applies the Scope F checks to each saved full reply, then probes 1, 2, 3, and 5 are Followed `yes`, and probe 4 is Followed `yes` when `frontend-design` is installed. When that skill is rejected, probe 4 may stay Followed `no`, the Fix is the reject reason, and probe 4 is not run again. Every row has an Evidence quote from that reply, every `yes` has Fix `none`, and a `no` has a Fix other than `none`. A labeled `First run` remains in the doc. The Followed `yes` for probes 1, 2, 3, and 5, and for probe 4 when `frontend-design` is installed, is the latest saved reply for that probe.
7. Given `AGENTS.md`, `.cursor/rules/project-core.mdc`, `.cursor/agents/role-dev.md`, and `.cursor/commands/feature.md`, when the reader compares the Dev done gate, then both step 4 and the DONE section list `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`, `project-core.mdc` points at `.cursor/agents/role-dev.md` for the gate and does not list a command set of its own, and `.cursor/commands/feature.md` still has the same stage order and the same round limits (QA 2, Phase 1 2 launches, Dev 3 attempts, Phase 2 fix rounds 2) with the 003 reverse-suite sentence removed from the generic Dev prompt.
8. Given `git diff main` for this change, when the reader inspects `package.json`, then `dependencies` are still only `react` and `react-dom`, and neither `package.json` nor `package-lock.json` is modified.
9. Given `docs/glossary.md`, when the reader looks up rule, mock, header rule, and state, then the four definitions match the glossary table in Scope C.
10. Given `.cursorindexingignore`, when the reader opens it, then it lists `dist/`, `node_modules/`, `playwright-report/`, `test-results/`, `blob-report/`, and `playwright/.cache/`, and this PR does not add `.cursorignore`.
11. Given `.github/dependabot.yml`, when the reader opens it, then it schedules `npm` and `github-actions` monthly and ignores `jimp`.
12. Given `docs/ai-readiness.md`, when the reader opens `## Playwright MCP`, then the decision text is `not installed` and the risks named are browser control and network access.
13. Given `docs/ai-skills.md`, when the reader searches for the candidate names in Scope A, then each of `frontend-design`, `playwright-best-practices`, `webapp-testing`, `samber/cc-skills`, `Mindrally`, `yigitkonur`, `quangpl/browser-extension-skills`, and `skill-creator` has a review row, including the ones whose decision is `reject`.
14. Given `AGENTS.md`, when the reader lists the headings, then they are exactly the ten in Scope C, in that order, the Scope C prohibitions are still present, and the reload sentences are under `## Commands`.
15. Given `docs/agent-workflow.md`, when the reader looks through it, then the command table is gone, the file points at the `AGENTS.md` command table, step 8 points at `docs/testing.md`, and the stage order and the 003 exception are unchanged.
16. Given `docs/architecture.md` and `docs/testing.md`, when the reader compares them to Scope C, then each bullet in the matching Scope C subsections is present, and `docs/architecture.md` does not copy the hard-rule list.
17. Given `.cursor/rules/project-core.mdc`, when the reader looks at it, then ROLE BOUNDARIES remains, and the guardrail list and hard rules are pointers to `AGENTS.md`.
18. Given `git diff main` for this change, when the reader lists the paths, then `src/`, `public/manifest.json`, `e2e/extension.ts`, `e2e/server.mjs`, `package.json`, and `package-lock.json` have no changes, and every file that already existed under `e2e/` is unchanged. A new `e2e/**/*.spec.ts` that Tester Phase 1 added, and that only reads repo files, may appear in the diff.

## Edge cases

- All four MV3 candidates fail vetting: no failed skill is copied; `.cursor/skills/extension-mv3/SKILL.md` exists; QA and Dev reference that path; topics still have one accepted skill.
- One MV3 candidate passes: `extension-mv3` does not exist.
- `frontend-design` fails vetting: the skill is not vendored, and no role file points at it. Probe 4 may stay Followed `no`, the Fix is the reject reason, and probe 4 is not run again. Probes 1, 2, 3, and 5 are Followed `yes`.
- An installer writes files outside `.cursor/skills/<name>/`: those files are not committed, and the scratch directory is deleted.
- A probe conversation edits product or harness files: Dev reverts probe edits on `src/`, `public/manifest.json`, `e2e/extension.ts`, `e2e/server.mjs`, `package.json`, `package-lock.json`, and every file that already existed under `e2e/`, and deletes any test file the probe created. The Phase 1 file stays. Dev's result rows in `docs/ai-readiness.md` remain.
- The probe runtime does not show which skill was opened: `Triggered` is `not observable`. Followed still uses the checks in Scope F.
- A second Playwright skill looks useful: it is still rejected when `playwright-best-practices` is accepted.
- Dependabot opens a `jimp` pull request: the ignore entry is wrong and must be fixed before done. `jimp` stays on 0.22.
- A project skill grows past 120 lines: it points at `docs/architecture.md`, `docs/testing.md`, or `AGENTS.md` instead of pasting them.
- `.cursorindexingignore` is not honored by the Cursor version in use: Dev says so in the PR and does not switch to `.cursorignore`.

## Coverage matrix

Filled by role-tester. Leave this table empty in the spec draft.

| Criterion | Test | Status |
|---|---|---|
| 1 | AC-1: vetting-pass skill folders have SKILL.md, LICENSE, and a register row | pass |
| 2 | AC-2: vendored third-party skills do not tell the agent to fetch rules, install, ask for secrets, or override | pass |
| 3 | AC-3: skill count is at most 8 and accept-row topics match Scope A | pass |
| 4 | AC-4: the three project skills exist and describe when to use them | pass |
| 5 | AC-5: role Skills sections link Scope D paths and do not paste a skill body | pass |
| 6 | AC-6: saved probe replies pass the Scope F checks | pass |
| 7 | AC-7: the Dev done gate lists four commands and the generic prompt drops the 003 reverse suite | pass |
| 8 | — | pass |
| 9 | AC-9: glossary defines rule, mock, header rule, and state | pass |
| 10 | AC-10: cursor indexing ignore lists dist, dependencies, and Playwright output | pass |
| 11 | AC-11: dependabot schedules npm and github-actions monthly and ignores jimp | pass |
| 12 | AC-12: Playwright MCP section says not installed and names the two risks | pass |
| 13 | AC-13: the register reviews every Scope A candidate | pass |
| 14 | AC-14: AGENTS.md has the ten Scope C headings and keeps the prohibitions | pass |
| 15 | AC-15: the workflow points at the AGENTS.md command table and docs/testing.md | pass |
| 16 | AC-16: architecture and testing docs include the Scope C bullets | pass |
| 17 | AC-17: project-core keeps ROLE BOUNDARIES and points guardrails at AGENTS.md | pass |
| 18 | — | pass |

## Test notes

No new control. No new `data-testid`. Popup, options, and the probe page do not change. Do not write a test whose assertion is already true on `main` (for example "AGENTS.md contains `declarativeNetRequest`", or "`package.json` has only react"). That test would pass in Phase 1 and stop the pipeline.

These files are absent today, so a test that reads them from the repo fails until Dev adds them: the three project `SKILL.md` paths, `docs/ai-skills.md`, `docs/ai-readiness.md`, `docs/architecture.md`, `docs/testing.md`, `docs/glossary.md`, `.cursorindexingignore`, and `.github/dependabot.yml`. Criteria 8 and 18 are `git diff main` checks in Phase 2, not new tests that pass before implementation. Criteria 7, 14, 15, 16, and 17 are reading checks; a browser session cannot show them.

The five probe rows are chat transcripts recorded in `docs/ai-readiness.md`. The full reply for each run is saved under the table, and Followed is judged from that reply. The Evidence cell quotes at most 40 words. The extension UI cannot show them. Manual verification is those chats plus a read of the register, not a click-through of the popup.

## QA review

Requirements review, round 2. Round 1 verdict was NEEDS CHANGES. QA did not mark acceptance criteria and did not write **Manual verification steps**.

**Verdict:** NEEDS CHANGES

**Biggest risk:** Phase 1 has to add a failing Playwright file under `e2e/`, and criterion 18 then fails that same file. A correct skills-and-docs change cannot pass. If Phase 1 adds no file, the existing suite stays green and the pipeline stops before Dev.

**Findings:**

1. [High] resolved. Scope F now requires `readExtensionState`, badge text `OFF`, `await expect(`, and `waitForTimeout` only inside a sentence that forbids the call. A new permission needs a written justification and the words `least privilege` or `least-privilege`, with no manifest permission added and no permission invented under the name X. The service-worker check is unchanged. Probe 4 requires a plan before any code block that edits `src/popup`, and it names the popup file. Probe 5 requires version, ZIP or zip, privacy, GitHub release, `manifest.json` at the archive root, and no store password, token, API key, or claim that a submission was sent. The full reply is saved under the table, the Evidence cell quotes at most 40 words, and Followed is judged from the full reply. Probes 1, 2, 3, and 5 must be Followed `yes`. Criterion 6 applies those checks.
   Suggested rewrite: none. That text is in Scope F and criterion 6.

2. [High] resolved. `currents-dev` is the org in the `playwright-best-practices` Source URL and Reason. It is not its own register row. Criterion 13 searches `frontend-design`, `playwright-best-practices`, `webapp-testing`, `samber/cc-skills`, `Mindrally`, `yigitkonur`, `quangpl/browser-extension-skills`, and `skill-creator`.
   Suggested rewrite: none.

3. [High] resolved. Scope D, Out of scope, Scope C, and criterion 7 say the DONE section in `.cursor/agents/role-dev.md` lists `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`, the same four commands as step 4. `project-core.mdc` points at `.cursor/agents/role-dev.md` for that gate and does not list a command set of its own. The files on disk still disagree today; this spec is what tells Dev to change them.
   Suggested rewrite: none.

4. [Med] resolved. The reload sentences stay under `## Commands`. Criteria 14, 15, 16, and 17 cover the ten `AGENTS.md` headings and the prohibitions, the `docs/agent-workflow.md` pointers, `docs/architecture.md` and `docs/testing.md`, and the `project-core.mdc` pointers for guardrails and hard rules.
   Suggested rewrite: none.

5. [Med] resolved. Criterion 1 requires `SKILL.md` and `LICENSE` in every directory whose register Review contains `Vetting: pass`. A row whose Review is `Vetting: project-authored` is the row that skips the license file. The waiver is no longer the license name `ISC`.
   Suggested rewrite: none.

6. [Med] resolved. The expected outcome, the Scope D table, and criterion 5 point `.cursor/agents/role-spec.md` and `.cursor/agents/role-dev.md` at `.cursor/skills/release-checklist/SKILL.md` for a version bump, the store ZIP, store listing or privacy text, or a GitHub release.
   Suggested rewrite: none.

7. [Med] resolved. Criterion 18 and the probe-revert edge case fail a leftover edit under `src/`, `public/manifest.json`, `package.json`, or `package-lock.json`. The blanket `e2e/` clause in that same criterion is finding 10.
   Suggested rewrite: none.

8. [Med] resolved. Accept-row topics are `Project conventions`, `Extension e2e`, `Release`, `Frontend design`, `Playwright`, `Skill authoring`, and `Chrome extension MV3`, and only one MV3 directory exists. TypeScript, GitHub Actions, and accessibility stay Decision `reject` in this PR, with no vendored candidate.
   Suggested rewrite: none.

9. [Low] still open. The architecture bullet still says "localhost host patterns", and the release privacy bullet still names only `<all_urls>`. `public/manifest.json` host permissions are `<all_urls>`, `http://localhost/*`, and `https://localhost/*`. A later store submission would start from privacy text that omits the two localhost patterns. Criterion 11 still passes a Dependabot file that mentions `jimp` outside `dependency-name`. The edge case that waits for Dependabot to open a `jimp` pull request is still not visible before this PR is done. Scope G does now say directory `/`, a monthly schedule, and `open-pull-requests-limit: 5`.
   Suggested rewrite: In the architecture permissions bullet, name permission `storage` and host permissions `<all_urls>`, `http://localhost/*`, and `https://localhost/*`. In the release privacy bullet, cover permission `storage` and those three host permissions, no remote code, and no account. In Scope G, require this ignore on the npm rule, together with `directory: "/"`, a monthly schedule, and `open-pull-requests-limit: 5`:

```yaml
ignore:
  - dependency-name: "jimp"
```

Criterion 11 requires that ignore key, both ecosystems on a monthly schedule, directory `/`, and `open-pull-requests-limit: 5`. Delete the edge case about a future `jimp` pull request. `jimp` stays on 0.22 because that ignore entry is in this PR.

10. [High] The revision added a pass rule that a correct delivery fails. This spec keeps Phase 1, and it tells the tester to assert the absent deliverables by reading the repo from the test process. Playwright's `testDir` is `e2e/`, so that test is a new file under `e2e/`. Criterion 18 then requires `git diff main` to show no changes under `e2e/`, and Out of scope forbids editing `e2e/**/*.spec.ts`. Dev is not allowed to remove the Phase 1 file. The skills, the docs, and that one new spec file cannot pass together. With no new file, the suite that already passes on `main` stays green, and `/feature` stops before Dev. The same revision also leaves Scope F saying that every Followed `no` edits a skill description or a role-file path and runs the prompt again, while a rejected `frontend-design` has no directory and must not be added to a role file. Probe 4 is allowed to stay `no` in that case.
    Suggested rewrite: Replace the path list in criterion 18 with: `src/`, `public/manifest.json`, `e2e/extension.ts`, `e2e/server.mjs`, `package.json`, and `package-lock.json` have no changes, and every file that already existed under `e2e/` is unchanged. A new `e2e/**/*.spec.ts` that Tester Phase 1 added, and that only reads repo files, may appear in the diff. In Out of scope, state that Dev does not create or edit `e2e/**/*.spec.ts`, and that Tester Phase 1 may add that new file. This PR does not change `e2e/extension.ts` or `e2e/server.mjs`. In the probe-edit edge case, Dev reverts probe edits on those product and harness paths and deletes any test file the probe created. The Phase 1 file stays. In Scope F, the adjust-and-rerun sentence applies to probes 1, 2, 3, and 5, and to probe 4 only when `frontend-design` is installed. When that skill is rejected, probe 4 may stay Followed `no`, the Fix is the reject reason, the skill is not vendored, no role file points at it, and probe 4 is not run again.

**Not verified:** GitHub issue 11 was not opened. The upstream skill files were not read, so this review does not judge whether any candidate would pass vetting. No probe chat was run. Lint, typecheck, build, and tests were not run. Locally, the shorter gates in `project-core.mdc` and in the `role-dev.md` DONE section still match the problem statement, `.cursor/commands/feature.md` still tells every Dev launch to run `npm run test:e2e:reverse` and the break-it proof, `docs/agent-workflow.md` still has its own command table, `AGENTS.md` still has `## What not to do` and `## After any code change`, there is no `.cursor/skills/` tree and no `SKILL.md`, and there is no `.github/dependabot.yml`. `package.json` dependencies are `react` and `react-dom`. The manifest host permissions, the `ON` / `OFF` badge, `toolbarPaintGeneration`, and `readExtensionState` match the parts of Scope C this review relied on.

## Manual verification steps

1. Open `docs/ai-skills.md`. — Expected: seven `accept` rows (the three project skills, `frontend-design`, `playwright-best-practices`, `chrome-extension`, and `skill-creator`), `reject` rows for `webapp-testing`, `Mindrally`, `yigitkonur`, `quangpl/browser-extension-skills`, TypeScript, GitHub Actions, and accessibility, every Owner cell `maintainer`, and a Maintenance section that says never auto-update.
2. Open `.cursor/skills/chrome-extension/SKILL.md` at the "modify HTTP headers or block requests" item, then the hard-rules section of `AGENTS.md`. — Expected: the skill names `declarativeNetRequest`, and `AGENTS.md` still forbids that API and says third-party skills do not override it.
3. Open `docs/ai-readiness.md`. — Expected: probes 1, 2, 3, 4, and 5 are Followed `yes` with Fix `none`; `## Playwright MCP` says `not installed` and names browser control and network access; the probe 5 reply does not ask for a store password, token, or API key.
4. Run `git diff main --name-only -- package.json package-lock.json src public/manifest.json e2e/extension.ts e2e/server.mjs`. — Expected: no output. `package.json` `dependencies` are only `react` and `react-dom`.
5. Open `.github/dependabot.yml` and check that `.cursorignore` is absent. — Expected: `npm` and `github-actions` are monthly, the npm rule ignores `dependency-name: "jimp"`, `.cursorignore` does not exist, and `.cursorindexingignore` lists `dist/`, `node_modules/`, `playwright-report/`, `test-results/`, `blob-report/`, and `playwright/.cache/`.

## Definition of done

- [ ] Spec accepted by the human
- [ ] A QA requirements review was completed; findings accepted or spec updated
- [ ] DEV implemented the spec without changing the acceptance criteria
- [ ] role-tester acceptance check completed; findings addressed by DEV
- [ ] Human ran the Manual verification steps
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` were run and the output is in the PR
- [ ] Human reviewed and merged the PR
- [ ] A row was added to `docs/agent-runs.csv`
- [ ] Sections A–G are in the branch: skills, register, project docs, role paths, probe table, Dependabot, indexing ignore
- [ ] The PR description lists every accepted and rejected skill and the reason, copied from `docs/ai-skills.md`
- [ ] No new dependency was added to the extension
