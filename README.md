# API Mock Chrome Extension

Intercept HTTP requests (fetch and XHR) in the browser and return fake responses — without the real server ever being called. Built for front-end developers who need to mock APIs during development, testing, or demos.

---

## What it does

- Intercepts `fetch` and `XMLHttpRequest` requests matching your rules
- Returns your configured status code and response body
- Works on any page including `localhost`
- Rules are toggled on/off instantly — no page refresh needed
- Zero network traffic for intercepted requests (they never leave the browser)

---

## Limitations and scope

- Only intercepts `fetch` and `XMLHttpRequest` calls made by **page JavaScript**. Requests from other extensions, the browser itself, native apps, or Service Workers running inside the page are **not** intercepted.
- Matches on **URL + method only**. Request body, request headers, and query-string-aware matching are not supported beyond what `*` / `?` globs cover.
- Patterns are **glob-style** (`*` matches any characters, `?` matches one character, case-insensitive). Regular expressions are not supported.
- Rules are stored per browser profile via `chrome.storage.local`. They **do not sync** across browsers or machines.
- Rules apply to **every tab** the extension is enabled on. There is no per-origin or per-tab scoping.

---

## Installation

### Option A — Load from this repo (no build needed)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the **`dist`** folder inside the project

> The `dist` folder is pre-built and committed — you do not need Node.js or npm to use the extension.

After running `git pull` later on, click the **refresh icon** on the extension card in `chrome://extensions` so Chrome picks up the updated `dist`.

### Option B — Build from source

```bash
npm install
npm run icons
npm run build
```

Then load the `dist` folder as above.

---

## Quick start — mock your first request

### 1. Pin the extension

After loading, click the puzzle icon in Chrome's toolbar and pin **API Mock Interceptor**.

### 2. Open Settings

Click the extension icon → click **Open settings**.

### 3. Add a rule

Click **Add rule** and fill in the form:

| Field | Example | Notes |
|---|---|---|
| Name | `Get timezone zone` | A label for yourself |
| URL pattern | `localhost:8080/api/v1/lockerconf/datetime/zone` | See pattern syntax below |
| Method | `POST` | Or `ANY` to match all methods |
| Status code | `200` | Any HTTP status 100–599 |
| Response body | `{"zone": "Europe/London"}` | Any text or JSON string |
| Response headers | *(optional)* | `Content-Type: application/json` is always included |
| Delay ms | `0` | Add artificial latency if needed |

Click **Save rule**.

### 4. Refresh your app tab

Go to your application page and refresh it. Matching requests will now be intercepted.

---

## Common scenarios

Short recipes for the situations that come up most often. Each one is a single rule you can add from the Options page.

### Confirm interception is working

Before adding any real rules, prove the wiring is good with a catch-all:

| Field | Value |
|---|---|
| URL pattern | `*` |
| Method | `ANY` |
| Status code | `200` |
| Response body | `{"mocked": true}` |

Refresh your app tab. Every request will now return `{"mocked": true}`. Disable or delete the rule once you've confirmed it.

### Simulate a server error

Test how your UI surfaces failures without touching the backend:

| Field | Value |
|---|---|
| URL pattern | `localhost:8080/api/orders` |
| Method | `POST` |
| Status code | `500` |
| Response body | `{"error": "Internal server error"}` |

### Simulate a slow network

Use the **Delay (ms)** field to see loading spinners, skeletons, and timeout handling:

| Field | Value |
|---|---|
| URL pattern | `localhost:8080/api/v1/users` |
| Method | `GET` |
| Status code | `200` |
| Response body | `[{"id": 1, "name": "Alice"}]` |
| Delay (ms) | `3000` |

### Test empty-list state

Create a rule with the same URL pattern as your real list endpoint, set the body to `[]`, and toggle the rule on/off to flip between populated and empty results.

### Cover both dev and staging with one rule

A pattern like `*/api/v1/users` matches `localhost:8080/api/v1/users`, `staging.example.com/api/v1/users`, and any other host that exposes the same path. The leading `*` swallows the host and protocol.

---

## URL pattern syntax

Patterns match against both the full URL and the protocol-stripped URL, so you can omit `http://`.

| Pattern | Matches |
|---|---|
| `localhost:8080/api/v1/users` | Exact URL, any protocol |
| `localhost:8080/api/*` | Any path under `/api/` |
| `localhost:8080/api/v*/users` | `/api/v1/users`, `/api/v2/users`, etc. |
| `*/api/users` | Any host, path `/api/users` |
| `localhost:8080/*` | All requests to localhost:8080 |

**Wildcard rules:**
- `*` matches any sequence of characters (including `/`)
- `?` matches any single character
- Matching is case-insensitive
- Protocol (`http://` / `https://`) is optional in the pattern

---

## Managing rules

### Enable / disable a single rule

Toggle the switch on the rule card in the Options page, or use the per-rule toggle in the popup.

### Enable / disable all interception

Click the extension icon → use the toggle in the indigo header bar. When grey, all requests pass through regardless of rules.

### Edit a rule

Click **Edit** on the rule card. All fields can be changed. Click **Save rule**.

### Delete a rule

Click **Delete** on the rule card → confirm with **Confirm**. No browser dialogs are used.

### Reset / clear all rules

- **Per-rule:** Delete each rule from the Options page using the flow above.
- **Wipe everything:** Remove the extension from `chrome://extensions` and load it again. On reinstall, the service worker re-seeds an empty rule list and default settings.

### Import / Export rules

Use the **Export** and **Import** buttons in the Options page header to move rules between browsers, profiles, or teammates.

- **Export** downloads all your current rules as `ninja-interceptor-rules-YYYY-MM-DD.json`.
- **Import** reads a JSON file and **appends** its rules to your existing list. Existing rules are never modified or removed, and imported rules are assigned fresh IDs to avoid collisions.
- Invalid entries (missing `name`, `urlPattern`, `method`, or `statusCode`) are skipped, and the count appears in the inline status message.

The export file format is:

```json
{
  "version": 1,
  "exportedAt": "2026-04-25T12:00:00.000Z",
  "rules": [
    {
      "id": "…",
      "name": "Get timezone zone",
      "enabled": true,
      "method": "GET",
      "urlPattern": "localhost:8080/api/v1/lockerconf/datetime/zone",
      "statusCode": 200,
      "responseBody": "{\"zone\":\"Europe/London\"}",
      "responseHeaders": [],
      "delayMs": 0,
      "createdAt": 1714041600000
    }
  ]
}
```

Import also accepts a bare array of rule objects for convenience.

---

## Popup overview

| Element | What it does |
|---|---|
| Header toggle | Globally enables / disables the extension |
| Rule list | Shows all rules with per-rule on/off toggles |
| "X of Y rules active" | Count of currently enabled rules |
| Open settings | Opens the full Options page |

---

## Verifying that a rule is working

Intercepted requests **do not appear in the Chrome DevTools Network tab** — this is by design. No actual HTTP request is made, so there is nothing for the Network panel to record.

To confirm interception is active, open the DevTools **Console** on your app's page and run:

```js
fetch('http://localhost:8080/api/v1/your/endpoint', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('Mock response:', data))
```

You should see your configured response body logged immediately.

---

## Response body tips

The response body is returned as-is as a string. Make sure it matches what your application expects to parse.

**JSON example:**
```json
{
  "zone": "Europe/London",
  "offset": 1
}
```

**Error response example (status 422):**
```json
{
  "error": "Validation failed",
  "field": "zone",
  "message": "Invalid timezone value"
}
```

**Plain text example (status 200):**
```
OK
```

`Content-Type: application/json` is always added to every mock response. You can override it or add additional headers in the **Response headers** section of the rule form.

---

## Adding a delay

Set **Delay ms** to simulate slow network conditions. For example, `2000` will wait 2 seconds before returning the mock response.

---

## Troubleshooting

### Requests still reach the real server

1. Check that the **global toggle** in the popup is **on** (indigo, not grey)
2. Check that the specific **rule toggle** is on
3. Refresh the app tab — the content script must be injected at page load
4. Verify the URL pattern matches. Run this in the app's console to test:
   ```js
   window.fetch.toString()
   // Should show: async function(input, init) — NOT [native code]
   ```
5. Open Options and re-check the rule's URL pattern. Use `*` as a wildcard to widen the match if unsure.

### App receives the response but displays nothing / behaves incorrectly

The response body likely doesn't match the shape your application code expects. Inspect your app's service layer (Angular `HttpClient` subscription, React query handler, etc.) to see what fields it reads, then match your response body to that exact structure.

### `chrome.storage` errors in the console

This was a known issue in earlier versions where the extension tried to access `chrome.storage` in the MAIN world. It is fixed by the isolated-world bridge architecture — `bridge.js` reads storage in the ISOLATED world and forwards rules via `postMessage`. No action needed.

---

## Permissions

The manifest requests `host_permissions: ["<all_urls>"]` so the content script can be injected into every page — that's what lets you mock requests on any host you visit, not just `localhost`. The only Chrome API permission requested is `"storage"`, used to persist your rules locally.

Nothing is sent over the network by the extension itself. Intercepted requests are answered from your own configured response bodies and never leave the browser.

---

## Architecture

```
chrome.storage.local
       │
       │  (ISOLATED world)
  bridge.js ──── window.postMessage ────► interceptor.js  (MAIN world)
                                                │
                                    patches window.fetch
                                    patches XMLHttpRequest.prototype
                                                │
                                    ┌───────────┴───────────┐
                                  match?                  no match
                                    │                        │
                              fake Response           real server
```

The extension ships two content scripts:

| Script | World | Purpose |
|---|---|---|
| `content/interceptor.js` | MAIN | Patches `window.fetch` and `XMLHttpRequest.prototype` synchronously at `document_start` |
| `content/bridge.js` | ISOLATED | Reads `chrome.storage` (always available here) and forwards rules to the MAIN world |

This split is necessary because `chrome.storage` is unreliable in the MAIN world on some pages (the host page's own JavaScript can overwrite the `chrome` global).

---

## Development

```bash
# Install dependencies
npm install

# Generate icons (only needed once)
npm run icons

# Build (popup + options + service worker + content scripts)
npm run build

# Build and watch for changes
npm run build:watch
```

After any code change: run `npm run build`, then click the **refresh icon** on the extension card in `chrome://extensions`, and reload your app tab.

---

## Requirements

- Chrome 111 or later (`"world": "MAIN"` in manifest content scripts)
- Node.js 18+ (for building from source only)
