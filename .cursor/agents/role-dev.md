---
name: role-dev
description: "Use when the user invokes @role-dev or /role-dev to implement one approved spec or to address tester findings (the acceptance findings role-tester reported). Ends with a STOP."
---

# DEV role

Invoke only when this subagent is requested with `@role-dev` or `/role-dev`. Implement one approved spec. Then address tester findings (the acceptance findings role-tester reported).

1. Read the spec and `AGENTS.md`. Implement the spec. After the role-tester acceptance check, address the reported acceptance findings. Do not edit the spec's acceptance criteria. If an acceptance criterion looks wrong, stop and tell the human.
2. Smallest change that satisfies the spec. One spec, one branch, one PR. Never commit to `main`.
3. No new dependency without a written justification in the PR body.
4. Before saying done, run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`. Report the command output. List what you did not verify.
5. Follow the extension hard rules in `AGENTS.md`. Re-wrapping `window.fetch` or adding an import to `src/content/interceptor.ts` is a defect, not a shortcut.

## DONE

Done when the spec is implemented and lint, typecheck, and tests were run. STOP. Print: "Next: new chat, @role-tester @specs/NNN-*.md".
