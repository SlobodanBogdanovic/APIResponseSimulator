# Testing

`npm test` runs the Playwright suite after a build. `dist/` must already exist. `npm run test:e2e` builds `dist/`, then runs the same headless suite.

The fixture entry points in `e2e/extension.ts` are `launchExtension`, `extensionIdFrom`, `readExtensionState`, `openProbe`, and `PROBE_ORIGIN`.

How to write or change these tests: `.cursor/skills/extension-e2e-testing/SKILL.md`.

## CI

Workflow file `.github/workflows/ci.yml`. Job `verify` runs lint, typecheck, and build. Job `e2e` runs `npm run test:e2e`. The two jobs run in parallel.

The `e2e` job writes a flaky summary. A failed run uploads the HTML report, traces, and screenshots.
