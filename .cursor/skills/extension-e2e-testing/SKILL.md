---
name: extension-e2e-testing
description: >
  Use when writing or changing Playwright tests for this Chrome extension,
  including a test that toggles the extension OFF and checks the badge.
---

# Extension end-to-end tests

`AGENTS.md` wins on conflict with this skill.

Launch a persistent context with `launchExtension`: `chromium.launchPersistentContext`, channel `chromium`, headless, and one user-data directory per test.

`extensionIdFrom` reads the extension id from the host of the service worker URL.

`readExtensionState` runs on that service worker. It returns rules, `settings.extensionEnabled`, `badgeText`, and `title`. Badge text is `ON` or `OFF`.

Do not call `waitForTimeout`. Use web-first assertions: `await expect(...)`.

Probe origin is `http://127.0.0.1:4173` from `e2e/server.mjs`.

CI details are in `docs/testing.md`. Do not copy the workflow into this skill.

Do not copy the device-id, HMAC, or machine-SID helper from `e2e/extension.ts`.
