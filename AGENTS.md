# AGENTS.md — API Response Simulator

This file is the authoritative guide for any AI agent working on this codebase.
Read it entirely before making any changes.

---

## What this project is

A Chrome extension (Manifest V3) that intercepts HTTP requests (fetch and XHR)
from any browser tab and returns fake responses based on user-defined rules.
Built with React 19 + TypeScript + Tailwind CSS + Vite. Package name:
`api-response-simulator`. User-facing name: **API Response Simulator**.

Primary use case: a user's app calls `localhost:8080/api/*`. This extension
intercepts matching requests and returns a configured status code and response
body — without the real server ever receiving the request.

There is no website and no Vite dev server. `npm run dev` rebuilds `dist/`
when files change. Load `dist/` as an unpacked extension.

---

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install from `package-lock.json` |
| `npm run icons` | Generate `public/icons/*.png` with jimp 0.22. Once, before the first build if icons are missing. |
| `npm run dev` | Alias of `build:watch`. Rebuilds `dist/` on change. |
| `npm run build` | Three Vite builds, in this order. Order matters. |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` for `src/`, then for `e2e/` |
| `npm test` | Playwright. Run `npm run build` first. The smoke test loads unpacked `dist/`. |

`npm run build` is:

1. `vite build` — popup, options, service worker. `emptyOutDir: true`.
2. `vite build --config vite.content.config.ts` — interceptor IIFE. `emptyOutDir: false`.
3. `vite build --config vite.bridge.config.ts` — bridge IIFE. `emptyOutDir: false`.

Before saying work is done, run lint, typecheck, build, and test. Paste the
output. List what you did not verify.

---

## Architecture overview

```
src/
  content/interceptor.ts   — MAIN world. Patches fetch and XHR. Zero imports.
  content/bridge.ts        — ISOLATED world. Reads chrome.storage, postMessages rules.
  background/service-worker.ts — install defaults, opens the options page
  popup/                   — quick toggle + rule list (React)
  options/                 — full rule management UI (React)
  shared/types.ts          — MockRule, ExtensionSettings
  shared/storage.ts        — typed chrome.storage.local wrappers
scripts/gen-icons.mjs      — placeholder PNG icons (jimp@0.22)
public/manifest.json
vite.config.ts             — React pages + service worker (ES module)
vite.content.config.ts     — interceptor IIFE → dist/content/interceptor.js
vite.bridge.config.ts      — bridge IIFE → dist/content/bridge.js
e2e/                       — Playwright. Loads dist/ unpacked.
```

`chrome.storage.local` is not reliable in the MAIN world (the page can shadow
`chrome`). `bridge.ts` reads storage in the ISOLATED world and forwards
`rules` and `settings` with `window.postMessage`. The interceptor only updates
its closure variables from that message. It never calls `chrome.storage`.

---

## Conventions

- npm is the package manager. Commit `package-lock.json` when dependencies change.
- `dist/` is committed so the extension can be loaded without Node. Rebuild it
  when source or the manifest changes, and commit the result.
- All storage operations go through `src/shared/storage.ts`. Do not call
  `chrome.storage.local` from React components. Storage functions return Promises.
- Do not use `window.confirm()`. Use inline confirmation.
- One spec, one branch, one PR. Specs live in `specs/NNN-name.md`.
- QA writes `e2e/` tests before implementation. DEV does not edit those tests.
- Workflow: `docs/agent-workflow.md`. Run log: `docs/agent-runs.csv`.
- Internal names stay: `MockRule`, storage keys `rules` and `settings`, bridge
  message source `__ninja_interceptor_bridge__`. Renaming them breaks installs
  or splits the bridge from the interceptor.

### Adding a new field to MockRule

1. Add the field to `MockRule` in `src/shared/types.ts`.
2. Add it to the form in `src/options/components/RuleForm.tsx`.
3. Display it in `src/options/components/RuleCard.tsx` if relevant.
4. Inline the type change in `src/content/interceptor.ts` (no imports).
5. Use it in `findMatch()` or the fake response construction in `interceptor.ts`.
6. Run lint, typecheck, build, and test. Reload the unpacked extension.

---

## Guardrails

- Never commit to `main`. Work on a branch and open a PR.
- Never read or write `.env` files or secrets. No calls to production systems.
- No new dependencies without a written justification in the PR.
- No destructive commands (`rm -rf`, force push, dropping data) without asking first.
- Show a short plan before any multi-file change.
- If requirements are ambiguous, ask. Do not guess.
- Run lint, typecheck, and tests before saying "done". Report the actual output and never claim something passes without running it.
- Always list what you did NOT verify.

Roles: `@role-spec`, `@role-qa`, `@role-dev`. They apply only when @-mentioned.
`project-core` applies to every session.

---

## Hard rules — never violate these

### Content script

- `src/content/interceptor.ts` must have **zero import statements**.
  The IIFE build has no module resolution. Any import will break the build.
  All types and logic must be inlined in the single file.

- `window.fetch` and `XMLHttpRequest.prototype` must be patched **synchronously**
  at the top level of the file — before any `await`, callback, or message
  listener. The script runs at `document_start` and requests can fire before
  the bridge delivers rules.

- The `message` listener must only **update the `rules` and `settings`
  variables**. It must never re-run the patch code. Patching twice wraps
  `window.fetch` inside itself and breaks all requests.

- The patches capture `rules` and `settings` as closure variables.
  Bridge messages update those variables in place — the patch functions
  always read the current value.

- `src/content/bridge.ts` is the only content script that may call
  `chrome.storage`. `chrome.storage.onChanged` there must only `postMessage`
  the new `rules` and `settings`. It must not patch `fetch` or XHR.

- The bridge and the interceptor must keep the same `__source` string
  (`__ninja_interceptor_bridge__`). If they differ, rules never arrive and
  every request hits the real server.

### Manifest

- `"world": "MAIN"` must be present on `content/interceptor.js`.
  Without it the content script runs in an isolated context and cannot
  patch the page's `window.fetch` or `XMLHttpRequest`. Remove it and
  nothing works. Requires Chrome 111+.

- `content/bridge.js` must stay `"world": "ISOLATED"`.

- Do not add `declarativeNetRequest` to permissions or use it anywhere.
  It cannot return custom response bodies. It is not used in this project.

### Build

- `emptyOutDir: false` must remain in `vite.content.config.ts` and
  `vite.bridge.config.ts`. Either of those builds wiping `dist/` deletes
  the other build's output.

- Both content configs must use `rollupOptions` directly — not `lib` mode.
  The `lib` mode + `entryFileNames` combination produces unpredictable output
  filenames across Vite versions. Outputs must stay exactly
  `dist/content/interceptor.js` and `dist/content/bridge.js`.

- `jimp` is pinned to `@0.22`. Do not upgrade it. jimp v1 has a completely
  different API and `scripts/gen-icons.mjs` will break silently.

### URL matching

- `findMatch()` tests both the raw URL and the protocol-stripped URL.
  A user enters `localhost:8080/api/*` as a pattern. The actual fetch URL
  is `http://localhost:8080/api/users`. Both must be tested — the raw URL
  test alone will silently fail to match.

### XHR

- XHR is patched via `XMLHttpRequest.prototype.open` and `.send`.
  Do not use subclassing (`class extends XMLHttpRequest`). Subclassing +
  `Object.defineProperties` fights native XHR property descriptors and
  breaks silently in some Chrome versions.

- XHR fake responses must fire events in this exact order:
  `readystatechange` → `load` → `loadend`
  Wrong order breaks frameworks that check `readyState` in load handlers.

---

## Chrome API constraints

| API | Available in MAIN world | Min Chrome |
|---|---|---|
| `chrome.storage.local` | Unreliable (page can shadow `chrome`) | 102 |
| `"world": "MAIN"` in manifest | Yes | 111 |
| `declarativeNetRequest` custom body | No | — |

If the user reports the extension not working, ask for their Chrome version first.

---

## State management

- `chrome.storage.local` is the single source of truth for rules and settings.
- Storage keys: `"rules"` (`MockRule[]`), `"settings"` (`ExtensionSettings`).
- The options page writes to storage via `src/shared/storage.ts` helpers.
- The bridge reads storage on load and listens to `onChanged`.
- The interceptor receives those updates through `postMessage`.
- The popup reads from storage on mount.
- The service worker only sets defaults on install — it is not involved in
  rule management at runtime.
- The options page does not message the service worker after mutations.
  The bridge syncs automatically via `chrome.storage.onChanged`.

---

## What not to do

- Do not add imports to `src/content/interceptor.ts`
- Do not move patch code inside a function that is called asynchronously
- Do not call `applyPatches` or re-wrap `window.fetch` more than once
- Do not use `window.confirm()` anywhere in the UI — use inline confirmation
- Do not use `lib` mode in `vite.content.config.ts` or `vite.bridge.config.ts`
- Do not upgrade `jimp` past `0.22`
- Do not add `declarativeNetRequest` to the manifest
- Do not remove `"world": "MAIN"` from the interceptor content script
- Do not set `emptyOutDir: true` in the content or bridge Vite configs
- Do not commit to `main`, read `.env` files, or add dependencies without a PR justification

---

## After any code change

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

Then in Chrome: `chrome://extensions` → click the refresh icon on the extension card, and reload the app tab.

The extension does not hot-reload. A full rebuild and manual refresh is always required.

---

## Minimum Chrome version

Chrome 111 — required for `"world": "MAIN"` in content_scripts manifest key.
Chrome 102 — required for `chrome.storage` in the ISOLATED-world bridge.
Effective minimum: **Chrome 111**.
