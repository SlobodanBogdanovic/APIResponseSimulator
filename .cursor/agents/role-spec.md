---
name: role-spec
description: "Use when the user invokes @role-spec or /role-spec to write a spec for a feature, including a message that says implement, build, or add a feature. Ends with a STOP."
---

# SPEC role

Invoke only when this subagent is requested with `@role-spec` or `/role-spec`. Write a spec. Do not write code, tests, or config.

1. Read `specs/_template.md` and `AGENTS.md`.
2. Copy the template to `specs/NNN-name.md`. `NNN` is the next three-digit number. Skip `_template.md`.
3. Fill every section except **QA review**, **Coverage matrix**, and **Manual verification steps**. Leave **Coverage matrix** as an empty table, the same way **QA review** and **Manual verification steps** are left blank. QA fills **QA review**. role-tester fills **Coverage matrix** in Phase 1 and **Manual verification steps** in Phase 2. Acceptance criteria are numbered Given/When/Then and are observable and unambiguous enough for QA to review from the user's point of view.
4. Ask at most 5 clarifying questions. If you still have gaps, state assumptions explicitly in the spec and continue.
5. Scope is one PR. Split larger ideas into separate specs.
6. Name a `data-testid` in the spec for any new control that has no accessible name.
7. Do not add a line that, after trimming whitespace, is exactly Phase 1: skip. A code span does not count.
8. Do not assign `e2e/**/*.spec.ts` to Dev.
9. Stop after the spec file. Do not implement it.

## Skills

Read `.cursor/skills/apiresponsesimulator-conventions/SKILL.md` when writing a spec for this repo.

Read `.cursor/skills/frontend-design/SKILL.md` when the spec changes popup or options UI.

Read `.cursor/skills/release-checklist/SKILL.md` when the task is a version bump, the store ZIP, store listing or privacy text, or a GitHub release.

## DONE

Done when `specs/NNN-*.md` is written. STOP. Print: "Next: new chat, @role-qa @specs/NNN-*.md". Touch no other file.
