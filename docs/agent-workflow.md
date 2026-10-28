# Agent workflow

Human-gated. Spec, QA, Dev, and Tester are Cursor subagents in `.cursor/agents/`. Tester is the fourth subagent, invoked with `@role-tester` or `/role-tester`. Invoke one per chat with `@role-spec`, `@role-qa`, `@role-dev`, or `@role-tester`, or pick `/role-spec`, `/role-qa`, `/role-dev`, or `/role-tester` from the `/` menu. You approve the spec after QA requirements review, Dev implements, role-tester checks acceptance, then you run the manual verification steps. To run that same sequence in one chat and review only the final branch, use `/feature`. That is the only path that chains roles. Existing Playwright tests stay in the repo and run in CI. Nothing merges itself.

## Flow

1. **Idea.** You describe the change in a sentence or two.
2. **Spec.** New chat. Type `@role-spec`, or choose `/role-spec` from the `/` menu, then the idea. The agent writes `specs/NNN-name.md` from `specs/_template.md` and stops. You edit or accept the draft. No code in this chat.
3. **QA requirements review.** New chat. Type `@role-qa`, or choose `/role-qa` from the `/` menu, and the spec path. The agent reviews the spec as a user advocate and writes findings into the spec's **QA review** section. Verdict: APPROVE or NEEDS CHANGES. You accept findings or send the spec back. No code, no new tests.
4. **You.** Decide whether the spec is ready to implement.
5. **Dev.** New chat. Type `@role-dev`, or choose `/role-dev` from the `/` menu, and the spec path. The agent implements the spec. It must not change the spec's acceptance criteria; if one looks wrong, it stops and tells you. After a later role-tester acceptance check, it addresses acceptance findings. One spec, one branch, one PR.
6. **Tester acceptance check.** New chat. Type `@role-tester`, or choose `/role-tester` from the `/` menu, and the spec path. The agent checks each acceptance criterion against `git diff main`, runs lint, typecheck, and the existing tests, flags unspecified behavior, and writes **Manual verification steps** into the spec. It does not fix code.
7. **You: manual test.** Run the spec's Manual verification steps in the unpacked extension (under 5 minutes).
8. **PR → CI → merge.** You open or review the PR. GitHub Actions runs install, lint, typecheck, build, and the existing Playwright suite. A failed run uploads the Playwright HTML report. You merge. After merge, append one row to `docs/agent-runs.csv`.

`@project-core` is always on. The roles are subagents. They run when you invoke `@role-spec`, `@role-qa`, `@role-dev`, or `@role-tester`, or pick `/role-spec`, `/role-qa`, `/role-dev`, or `/role-tester` from the `/` menu. Outside `/feature`, when a subagent returns, the parent reports the result and stops.

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

**Spec:** `@role-spec` Add a "duplicate rule" button on each rule card. Keep the copy disabled by default. Or `/role-spec` with the same sentence.

**QA:** `@role-qa` Review requirements for `specs/001-duplicate-rule.md`. Do not implement. Or `/role-qa` with the same sentence.

**Dev:** `@role-dev` Implement `specs/001-duplicate-rule.md`. Do not change the spec's acceptance criteria. Or `/role-dev` with the same sentence.

`@role-tester` Acceptance check for `specs/001-duplicate-rule.md` against `git diff main`. Do not fix code. Or `/role-tester` with the same sentence.

**Pipeline:** `/feature Add a duplicate button on each rule card. The new rule starts disabled.`

## /feature

One chat, from the idea to a pushed branch. Type `/feature` and the feature idea. The main agent follows `.cursor/commands/feature.md`. It launches the four role subagents and waits for each to finish. It does not write the spec, fill **QA review**, implement, or mark acceptance itself. You review once, at the end.

```
/feature Add a duplicate button on each rule card. The new rule starts disabled.
```

The agent takes the next free `NNN` and skips `specs/_template.md`. With the specs in the repo today, that example uses branch `feat/002-duplicate-rule` and `specs/002-duplicate-rule.md`. The number is the next free one, not a fixed `002`.

It creates `feat/NNN-slug` from local `main` before any role runs. A dirty tree, including untracked files, stops the run. It does not fetch, pull, or stash. It never pushes `main`, never merges, and never opens the PR.

Limits, then it stops and reports instead of continuing:

- QA requirements review: 2 rounds. A round is one `role-qa` review. **NEEDS CHANGES** sends High and Medium findings back to `role-spec`, then QA reviews again. An open High finding after round 2 stops the run before implementation. Medium and Low that remain are reported and do not block.
- Dev: 3 attempts to get `npm run lint`, `npm run typecheck`, and `npm test` green. `npm test` needs `npm run build` first. A failed build is a failed attempt. Missing command output is not a pass.
- Tester: 2 fix rounds. **NOT MET** goes back to `role-dev`, then tester runs again. **CANNOT VERIFY** does not start a fix.

When tester reports no **NOT MET**, the agent commits the spec and the implementation separately, pushes `feat/NNN-slug`, prints a PR description you can paste, appends a `pipeline` row to `docs/agent-runs.csv` with cost left blank, commits and pushes that row, and stops with "Ready for your review."

A stop before that (dirty tree, open High, red checks, or **NOT MET** after the last fix round) does not commit or push.

In every chat that is not `/feature`, one role only. When that subagent returns, the parent reports the result and stops.

## What you still do by hand

- Create the GitHub repo rules: protect `main`, require the CI check, require your approving review, do not allow force pushes.
- On the one-role path, review the QA requirements-review findings before implementation. `/feature` does not wait for that review. You read the pasted PR description instead.
- Run the Manual verification steps after the role-tester acceptance check.
- Open the PR yourself. `/feature` only pushes the feature branch and prints the description.
- Merge every PR yourself.
- Rename the GitHub repository if you want it to match the product name. This repo cannot do that.
- Fill `docs/agent-runs.csv` after each one-role task (the agents do not know duration or cost), including `qa_findings_accepted`. A `/feature` run appends its own `pipeline` row and leaves cost blank. After merge, fill duration, cost, CI, and human corrections on that row when you know them.
