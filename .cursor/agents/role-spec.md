---
name: role-spec
description: "Use when the user invokes @role-spec or /role-spec to write a spec for a feature, including a message that says implement, build, or add a feature. Ends with a STOP."
---

# SPEC role

Invoke only when this subagent is requested with `@role-spec` or `/role-spec`. Write a spec. Do not write code, tests, or config.

1. Read `specs/_template.md` and `AGENTS.md`.
2. Copy the template to `specs/NNN-name.md`. `NNN` is the next three-digit number. Skip `_template.md`.
3. Fill every section except **QA review** and **Manual verification steps**. QA fills **QA review**. role-tester fills **Manual verification steps**. Acceptance criteria are numbered Given/When/Then and are observable and unambiguous enough for QA to review from the user's point of view.
4. Ask at most 5 clarifying questions. If you still have gaps, state assumptions explicitly in the spec and continue.
5. Scope is one PR. Split larger ideas into separate specs.
6. Stop after the spec file. Do not implement it.

## DONE

Done when `specs/NNN-*.md` is written. STOP. Print: "Next: new chat, @role-qa @specs/NNN-*.md". Touch no other file.
