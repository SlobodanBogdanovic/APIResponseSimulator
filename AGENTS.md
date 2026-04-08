markdown# AGENTS.md — API Mock Interceptor

This file is the authoritative guide for any AI agent working on this codebase.
Read it entirely before making any changes.

---

## What this project is

A Chrome extension (Manifest V3) that intercepts HTTP requests (fetch and XHR)
from any browser tab and returns fake responses based on user-defined rules.
Built with React 18 + TypeScript + Tailwind CSS + Vite.

Primary use case: a user's app calls `localhost:8080/api/*`. This extension
intercepts matching requests and returns a configured status code and response
body — without the real server ever receiving the request.

---

## Architecture overview
src/
content/interceptor.ts     — core engine, runs inside the page's JS context
background/service-worker.ts — minimal: sets defaults, opens options page
popup/                     — quick toggle + rule list (React)
options/                   — full rule management UI (React)
shared/types.ts            — shared TypeScript interfaces
shared/storage.ts          — typed chrome.storage.local wrappers
scripts/
gen-icons.mjs              — generates placeholder PNG icons (jimp@0.22)
public/
manifest.json              — Chrome extension manifest
vite.config.ts               — builds React pages + service worker (ES module)
vite.content.config.ts       — builds content script (IIFE, separate build)

---

## Hard rules — never violate these

### Content script

- `src/content/interceptor.ts` must have **zero import statements**
  The IIFE build has no module resolution. Any import will break the build.
  All types and logic must be inlined in the single file.

- `window.fetch` and `XMLHttpRequest.prototype` must be patched **synchronously**
  at the top level of the file — before any `await`, callback, or
  `chrome.storage` call. The script runs at `document_start` and requests
  can fire before storage loads.

- `chrome.storage.onChanged` must only **update the `rules` and `settings`
  variables**. It must never re-run the patch code. Patching twice wraps
  `window.fetch` inside itself and breaks all requests.

- The patches capture `rules` and `settings` as closure variables.
  Storage changes update those variables in place — the patch functions
  always read the current value.

### Manifest

- `"world": "MAIN"` must be present in `content_scripts`.
  Without it the content script runs in an isolated context and cannot
  patch the page's `window.fetch` or `XMLHttpRequest`. Remove it and
  nothing works. Requires Chrome 111+.

- Do not add `declarativeNetRequest` to permissions or use it anywhere.
  It cannot return custom response bodies. It is not used in this project.

### Build

- `emptyOutDir: false` must remain in `vite.content.config.ts`.
  The second build must not wipe the first build's output.

- `vite.content.config.ts` must use `rollupOptions` directly — not `lib` mode.
  The `lib` mode + `entryFileNames` combination produces unpredictable output
  filenames across Vite versions. The content script must always output to
  exactly `dist/content/interceptor.js`.

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
| `chrome.storage.local` | Yes | 102 |
| `"world": "MAIN"` in manifest | Yes | 111 |
| `declarativeNetRequest` custom body | No | — |

If the user reports the extension not working, ask for their Chrome version first.

---

## Build system

Two separate Vite builds run in sequence:
npm run build
└── vite build                              # React pages + service worker
└── vite build --config vite.content.config.ts  # content script as IIFE

The content script must be IIFE format because Chrome cannot load ES module
content scripts. React pages and the service worker use ES module format.

Icon files must exist in `public/icons/` before the build runs:
npm run icons   # generates icon16.png, icon48.png, icon128.png via jimp@0.22

---

## State management

- `chrome.storage.local` is the single source of truth for rules and settings.
- Storage keys: `"rules"` (MockRule[]), `"settings"` (ExtensionSettings).
- The options page writes to storage via `src/shared/storage.ts` helpers.
- The content script reads from storage on load and listens to `onChanged`.
- The popup reads from storage on mount.
- The service worker only sets defaults on install — it is not involved in
  rule management at runtime.
- The options page does not message the service worker after mutations.
  The content script syncs automatically via `chrome.storage.onChanged`.

---

## Adding a new field to MockRule

1. Add the field to `MockRule` in `src/shared/types.ts`
2. Add it to the form in `src/options/components/RuleForm.tsx`
3. Display it in `src/options/components/RuleCard.tsx` if relevant
4. Inline the type change in `src/content/interceptor.ts` (remember: no imports)
5. Use it in `findMatch()` or the fake response construction in `interceptor.ts`
6. Run `npm run build` and reload the extension

---

## Adding a new storage operation

All storage operations go through `src/shared/storage.ts`.
Do not call `chrome.storage.local` directly from components.
All functions must return Promises.

---

## What not to do

- Do not add imports to `src/content/interceptor.ts`
- Do not move patch code inside a function that is called asynchronously
- Do not call `applyPatches` or re-wrap `window.fetch` more than once
- Do not use `window.confirm()` anywhere in the UI — use inline confirmation
- Do not use `lib` mode in `vite.content.config.ts`
- Do not upgrade `jimp` past `0.22`
- Do not add `declarativeNetRequest` to the manifest
- Do not remove `"world": "MAIN"` from manifest content_scripts
- Do not set `emptyOutDir: true` in `vite.content.config.ts`

---

## After any code change
npm run build

Then in Chrome: `chrome://extensions` → click the refresh icon on the extension card.

The extension does not hot-reload. A full rebuild and manual refresh is always required.

---

## Minimum Chrome version

Chrome 111 — required for `"world": "MAIN"` in content_scripts manifest key.
Chrome 102 — required for `chrome.storage` in MAIN world content scripts.
Effective minimum: **Chrome 111**.