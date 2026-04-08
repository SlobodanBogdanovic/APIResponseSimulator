# NinjaInterceptor — API Mock Chrome Extension

Intercept HTTP requests (fetch and XHR) in the browser and return fake responses — without the real server ever being called. Built for front-end developers who need to mock APIs during development, testing, or demos.

---

## What it does

- Intercepts `fetch` and `XMLHttpRequest` requests matching your rules
- Returns your configured status code and response body
- Works on any page including `localhost`
- Rules are toggled on/off instantly — no page refresh needed
- Zero network traffic for intercepted requests (they never leave the browser)

---

## Installation

### Option A — Load from this repo (no build needed)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the **`dist`** folder inside the project

> The `dist` folder is pre-built and committed — you do not need Node.js or npm to use the extension.

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

Click the extension icon → use the toggle in the purple header bar. When grey, all requests pass through regardless of rules.

### Edit a rule

Click **Edit** on the rule card. All fields can be changed. Click **Save rule**.

### Delete a rule

Click **Delete** on the rule card → confirm with **Confirm**. No browser dialogs are used.

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
