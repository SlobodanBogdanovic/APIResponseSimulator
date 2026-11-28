# Store package prep

Prepare the public repo for a later Chrome Web Store upload. Do not submit the listing, do not tag a release, and do not change how requests are mocked.

## Scope

- Add `LICENSE` (MIT) and set `package.json` `"license"` to `MIT`.
- Add `PRIVACY.md`, `CHANGELOG.md`, and `docs/chrome-web-store.md`.
- Add `npm run package`, which runs the existing build and writes `api-response-simulator-<version>.zip` from `dist/` with `manifest.json` at the archive root. The zip is gitignored.
- Document the command in `AGENTS.md` and `README.md`.
- Allow the known sample-token finding from the vendored Playwright skill in `.gitleaks.toml`.
- Leave `public/manifest.json` permissions unchanged.

## Out of scope

Chrome Web Store submission, a git tag, history rewrite, and a committed marketing post.
