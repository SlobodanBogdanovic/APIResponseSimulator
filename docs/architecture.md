# Architecture

Draft for review in the pull request. Hard rules stay in `AGENTS.md`.

## Parts

- **Popup** (`src/popup`): quick toggle and rule list.
- **Options** (`src/options`): full rule management.
- **Service worker** (`src/background/service-worker.ts`): install defaults, badge, and opening the options page.
- **Bridge** (`src/content/bridge.ts`): ISOLATED world. Reads `chrome.storage` and posts rules to the page.
- **Interceptor** (`src/content/interceptor.ts`): MAIN world. Patches the page's fetch and XHR.

## Request path

A page calls `fetch` or XHR. The interceptor runs `findMatch`. A match becomes a fake response. Anything else continues as the real request.

## Settings path

The popup or options UI writes through `src/shared/storage.ts` into `chrome.storage.local`. The bridge listens with `chrome.storage.onChanged` and sends `postMessage`. The interceptor copies `rules` and `settings` into its closure variables.

## Service worker

`chrome.runtime.onInstalled` seeds missing `settings` and `rules`. Badge paint reads storage on install, on startup, and on service-worker load. `chrome.storage.onChanged` for `settings` repaints the badge. `toolbarPaintGeneration` is an in-memory counter and is not user state. A worker restart clears it. User state stays in `chrome.storage.local`.

## Permissions today

Permission `storage`. Host permissions `<all_urls>`, `http://localhost/*`, and `https://localhost/*`.

`declarativeNetRequest` is not used because it cannot return a custom response body. See `AGENTS.md`.
