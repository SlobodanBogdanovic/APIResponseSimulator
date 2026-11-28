# Chrome Web Store draft

This file is the paste-ready listing. The extension is not submitted.

## Listing

- Name: API Response Simulator
- Category: Developer Tools
- Language: English
- Short description: Intercept fetch and XHR and return fake responses while you develop.
- Detailed description: API Response Simulator lets you mock HTTP responses in the browser. Add a rule with a URL pattern, method, status, body, headers, and an optional delay. Matching page fetch and XMLHttpRequest calls return that response. Other calls continue to the real server. Rules stay in this browser profile. Turn the extension off from the toolbar popup and every request passes through.

Single purpose: Mock and modify HTTP API responses for development and testing.

## Permissions

- `storage` — save rules and the on/off setting in `chrome.storage.local`.
- `<all_urls>`, plus the localhost host entries already in the manifest — the content scripts run at `document_start` on the page you are testing. The API host is chosen while you work, so it cannot be fixed to one origin. `activeTab` ends after a click and would miss requests after navigation. Narrowing the match list would stop mocks on any host you did not list in advance.
- No `debugger`, `webRequest`, or `proxy` permission.

Remote code: No.

Data usage: the extension does not collect data. Rules and settings stay in local storage. Certify that nothing is sent to a server operated for this extension.

Privacy policy URL, after this file is on the public default branch: `https://github.com/SlobodanBogdanovic/APIResponseSimulator/blob/main/PRIVACY.md`

## Reviewer notes

1. Load the unpacked `dist` folder, or install the zip from `npm run package`.
2. Open the extension options and add a rule: URL pattern `jsonplaceholder.typicode.com/users`, method GET, status 200, body `[{"id":1,"name":"Ada"}]`.
3. On any page, run `fetch('https://jsonplaceholder.typicode.com/users').then((r) => r.json()).then(console.log)`.
4. Expected result: the console shows `[{ id: 1, name: "Ada" }]`. Disable the popup toggle and the same call reaches the public demo API instead.

## Scan note

`gitleaks` on the full history reports one `generic-api-key` finding in the vendored Playwright skill `.cursor/skills/playwright-best-practices/advanced/authentication-flows.md`. The match is a sample verification string inside a code block, not a credential. `.gitleaks.toml` allows that sample. History was not rewritten. Older commits still contain a retired README example; the current tree keeps that example only inside the spec and the test that forbid it.

`npm audit --omit=dev` reports no vulnerabilities. A full `npm audit` still reports issues in dev tools (`jimp` is pinned to 0.22 and must not be upgraded, plus ESLint and TypeScript ESLint). Those packages are not in the store zip.
