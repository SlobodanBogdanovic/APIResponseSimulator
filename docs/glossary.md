# Glossary

Meaning in this repo:

| Term | Meaning |
|---|---|
| rule | One `MockRule` in `chrome.storage.local` under `rules`. |
| mock | The fake response for a matching request: status, body, response headers, `delayMs`. Not a second stored object. |
| header rule | A `{ key, value }` entry in `responseHeaders` on a rule. Not a separate rule type. No request-header matching. |
| state | `settings.extensionEnabled` plus the rules. In Playwright, `readExtensionState` also returns `badgeText` (`ON` or `OFF`) and `title`. |
