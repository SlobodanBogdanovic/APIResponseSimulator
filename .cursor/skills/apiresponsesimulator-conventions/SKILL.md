---
name: apiresponsesimulator-conventions
description: >
  Use when editing this repository's extension architecture, writing a spec
  for this repo, or adding a permission. A new permission needs a written
  least-privilege justification.
---

# API Response Simulator conventions

`AGENTS.md` wins on conflict with this skill.

User-facing name **API Response Simulator**. Package `api-response-simulator`. Rule type `MockRule`. Do not rename storage keys `rules` and `settings` or the bridge source `__ninja_interceptor_bridge__`.

Map:

- Service worker `src/background/service-worker.ts` sets install defaults, paints badge `ON` or `OFF`, and opens the options page.
- Popup and options are the React UI.
- Storage keys are `rules` and `settings`.
- The MAIN-world interceptor has zero imports and patches fetch and XHR synchronously.
- `findMatch` tests the raw URL and the protocol-stripped URL.

Where to add a field: follow the numbered list in `AGENTS.md`. Do not copy those steps into this skill.

Done: run the four commands in `.cursor/agents/role-dev.md`, then reload the unpacked extension.

A new permission needs a written least-privilege justification before it is added. `declarativeNetRequest` stays forbidden. The reason is in `AGENTS.md`.

A control needs an accessible name.
