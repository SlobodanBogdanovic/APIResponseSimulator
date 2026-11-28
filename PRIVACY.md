# Privacy policy

API Response Simulator is a Chrome extension that returns fake HTTP responses for pages you visit while you are developing or testing.

## What stays on your device

Rules, response bodies, response headers, and the on/off setting are stored in `chrome.storage.local` in your browser profile. They are not sent to the author, to a website operated for this extension, or to an analytics service. There is no account.

## What the extension can see

The extension asks for the `storage` permission so it can save those rules. It asks for host access to `<all_urls>`, including localhost, so its page script can run when a page loads and answer a matching `fetch` or `XMLHttpRequest` with your mock. That host list cannot be a single site in advance, because the API host is whichever app you are working on.

A matching request is answered inside the page. The extension does not upload the URL, the request, or the response.

## Remote code

The package contains only the scripts built into the extension. It does not load code from a network server.

## Contact

Questions about this policy can be opened as an issue on https://github.com/SlobodanBogdanovic/APIResponseSimulator.
