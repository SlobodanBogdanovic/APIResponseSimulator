# Agent workflow

Human-gated. Spec, QA, and Dev are separate Cursor chats. You approve the spec, the test PR, and the implementation PR. Nothing merges itself.

## Flow

1. **Idea.** You describe the change in a sentence or two.
2. **Spec.** New chat. Type `@role-spec`, then the idea. The agent writes `specs/NNN-name.md` from `specs/_template.md` and stops. You edit or accept it. No code in this chat.
3. **QA.** New chat. Type `@role-qa` and the spec path. The agent writes Playwright tests from the acceptance criteria, runs them, and shows that they fail for the right reason. You review that PR and merge it before implementation. Tests load the unpacked `dist/` extension.
4. **Dev.** New chat. Type `@role-dev` and the spec path. The agent implements the spec without editing QA tests. One spec, one branch, one PR.
5. **CI.** On the pull request, GitHub Actions runs install, lint, typecheck, build, and Playwright. A failed run uploads the Playwright HTML report.
6. **You merge.** Branch protection must require the CI check and your review. After merge, append one row to `docs/agent-runs.csv`.

`@project-core` is always on. The role rules do nothing until you @-mention them.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install from `package-lock.json` |
| `npm run dev` | Rebuild `dist/` when source changes. Not a website. |
| `npm run build` | Production build into `dist/` (pages, then interceptor, then bridge) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` for `src/` and for `e2e/` |
| `npm test` | Playwright. Requires `npm run build` first |

## Example prompts

**Spec:** `@role-spec` Add a "duplicate rule" button on each rule card. Keep the copy disabled by default.

**QA:** `@role-qa` Write failing tests for `specs/001-duplicate-rule.md`. Do not implement the button.

**Dev:** `@role-dev` Implement `specs/001-duplicate-rule.md`. The QA tests are already on this branch. Do not edit them.

## What you still do by hand

- Create the GitHub repo rules: protect `main`, require the CI check, require your approving review, do not allow force pushes.
- Merge every PR yourself.
- Rename the GitHub repository if you want it to match the product name. This repo cannot do that.
- Fill `docs/agent-runs.csv` after each task (the agents do not know duration or cost).
