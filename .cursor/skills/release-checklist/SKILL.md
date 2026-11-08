---
name: release-checklist
description: >
  Use when preparing a Chrome Web Store submission, a version bump, the store
  ZIP, store listing or privacy fields, or a GitHub release.
---

# Release checklist

`AGENTS.md` wins on conflict with this skill.

Bump `version` in `package.json` and `public/manifest.json` together. Both are `1.0.0` today. This PR does not bump them.

Build with `npm run build`. ZIP the contents of `dist/` so `manifest.json` is at the archive root. Do not zip the repo root or `node_modules`.

Listing name **API Response Simulator**. Privacy text covers permission `storage` and host permissions `<all_urls>`, `http://localhost/*`, and `https://localhost/*`, no remote code, and no account. The human reviews that text before any submission. This PR does not submit to the store and does not call a store API.

GitHub release: the tag equals the version, and the release attaches the same ZIP. There is no publishing automation.

Do not ask for a store password, token, or API key.
