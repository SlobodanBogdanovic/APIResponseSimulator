# 001 — Rename QA Mode B to role-tester

## Who is the user and what problem do they have

The user is the human who runs this repo's gated agent pipeline. They are not a user of the API Response Simulator extension.

Today they open one QA subagent for two different jobs. Before implementation they invoke `@role-qa` or `/role-qa` and ask for Mode A, a requirements review. After implementation they invoke the same role and ask for Mode B, an acceptance check. The two jobs share one prompt, one description, and one handoff path, so the acceptance check has no name of its own. The requirements review also makes them type the words "Mode A", which they do not want to type.

## Problem

The human wants the requirements review to stay with `@role-qa` or `/role-qa`, and wants the acceptance check to be a separate role they can invoke as `@role-tester` or `/role-tester`.

On the working tree today, Mode B lives inside `.cursor/agents/role-qa.md`. Dev's done line sends the human back to `@role-qa Mode B`. `docs/agent-workflow.md`, `AGENTS.md`, `.cursor/rules/project-core.mdc`, and `specs/_template.md` tell the human that QA performs the acceptance check and writes **Manual verification steps**. There is no `.cursor/agents/role-tester.md`.

"Renamed" means Mode B moves. It is not copied. After this change, acceptance checking has one owner: role-tester.

Naming `@role-qa` or `/role-qa` and a spec path is the requirements review. The human does not mention Mode A.

## Expected user outcome

The human types `@role-qa` or `/role-qa`, plus a spec path, to get a requirements review. They do not type "Mode A". That chat writes the spec's **QA review** section, says APPROVE or NEEDS CHANGES, and ends with the existing handoff to Dev. If they also type "Mode A", the same review still happens. A missing "Mode A" is not a failure, and that chat does not refuse or stall to ask for it.

The human types `@role-tester` or `/role-tester`, plus a spec path, to get the acceptance check that Mode B does today. That chat judges each acceptance criterion, runs the same commands Mode B runs today, writes **Manual verification steps**, and does not change source or acceptance criteria.

The human who still types `@role-qa Mode B` is told, in that chat, to open role-tester. That chat does not also run the acceptance check.

Dev's done line tells the human to open `@role-tester` for the spec. The spec role's done line tells the human to open `@role-qa` for the spec. That sentence is exactly `Next: new chat, @role-qa @specs/NNN-*.md`. It contains no "Mode A".

The extension looks and behaves the same. No new dependency. Existing Playwright tests and CI stay as they are.

## User story

As the human running the agent pipeline, I want the acceptance check to be `@role-tester` / `/role-tester`, and I want `@role-qa` / `/role-qa` plus a spec path to start the requirements review, so that I can tell the two jobs apart by the role I invoke and I do not type Mode A.

## Scope

One PR. Docs and agent prompts only. Baseline is the working tree as read for this spec, not git HEAD. See Assumptions.

### What each rules file and agent file controls

These are not two copies of one prompt. This table describes the working tree today. The changes are in the next section.

| File | What it controls |
|---|---|
| `.cursor/agents/role-qa.md` | Subagent prompt for `@role-qa` and `/role-qa`. This is QA as it is now: Mode A requirements review and Mode B acceptance check. |
| `.cursor/agents/role-dev.md` | Subagent prompt for `@role-dev` and `/role-dev`. Implement one spec, then address acceptance findings. Done line points at `@role-qa Mode B`. |
| `.cursor/agents/role-spec.md` | Subagent prompt for `@role-spec` and `/role-spec`. Write one spec. Done line points at `@role-qa Mode A`. |
| `.cursor/rules/project-core.mdc` | Always-on rule for every session. It sets role names, allowed writes, and the "stop at the handoff" boundary. It does not contain the Mode A checklist or the Mode B procedure. It must agree with the agent prompts on role names and who may write which spec section. It must not grow a second copy of either procedure. |
| `.cursor/rules/role-qa.mdc` (git HEAD only; deleted in the working tree) | Older @-mentioned rule. It tells QA to write failing Playwright tests under `e2e/`. It does not describe Mode A or Mode B. |
| `.cursor/rules/role-dev.mdc` (git HEAD only; deleted in the working tree) | Older @-mentioned rule. It tells Dev to implement until those QA tests pass, and not to edit `e2e/**`. |
| `.cursor/rules/role-spec.mdc` (git HEAD only; deleted in the working tree) | Older @-mentioned rule. It tells Spec to fill every section so QA can test. It has no Mode A handoff. |

Do not recreate those three `.mdc` files. Do not add `.cursor/rules/role-tester.mdc`. The procedure for each role lives only in `.cursor/agents/`. The PR leaves the three HEAD rule files deleted so `@role-qa` has one definition.

`project-core.mdc` and the agent prompts stay in agreement on the points below. They stay different documents: boundaries in `project-core.mdc`, procedures in `.cursor/agents/`.

### Pipeline text to change

Every place below is in the working tree. The eight requirements-review checks stay. Text that tells the human to type "Mode A" changes as written in this section.

**`.cursor/agents/role-qa.md`**

- Change the frontmatter `description` so it names a requirements review for `@role-qa` and `/role-qa`. It must not tell the human to type "Mode A". It must not say that omitting "Mode A" is a reason to refuse or stall. It must not say that this role runs a Mode B acceptance check. It must say that a Mode B or acceptance-check request is redirected to role-tester and the role stops.
- Keep the requirements review as it is now: the eight checklist items, the output rules (max 10 findings, suggested rewrites, verdict APPROVE or NEEDS CHANGES, biggest risk, no rubber-stamping), the bans on Playwright tests and source edits, independence from Dev, and the done line `Next: you fix the spec, then new chat, @role-dev @specs/NNN-*.md`.
- The requirements-review block may keep an internal heading that contains "Mode A". That heading is an implementation detail. The human never types it. The prompt must not tell the human to type it, and it must not tell QA to announce "Mode A".
- Delete the sentence "State which mode you are in." Keep the sentences that say not to rewrite acceptance criteria without showing the human first, to state what could not be verified, and that existing Playwright tests and CI stay as they are.
- Delete the whole `MODE B` section, including its done line.
- Add a refusal that runs before any review. It keys off what the human's chat message asks QA to do, not off words inside the spec file, and not off the letters "Mode A" or "Mode B" by themselves. Refuse when the human asks QA to do any of these jobs: run Mode B, run an acceptance check, mark criteria MET / NOT MET / CANNOT VERIFY, or write **Manual verification steps**. Also refuse when the message asks for a requirements review and for one of those jobs in the same chat. Still run the requirements review when the message asks only for that review, even if it contains the letters "Mode A" or "Mode B". A message that is `@role-qa` or `/role-qa`, plus `Mode B`, plus a spec path, and that does not ask for a requirements review, is a request to run Mode B.
  - Do not run the acceptance check.
  - Do not write **QA review** or **Manual verification steps**.
  - Do not edit any file.
  - Do not run lint, typecheck, or tests.
  - Reply with exactly the following text and nothing else, then stop. When the message names a spec path, normalize that path to `specs/NNN-name.md` with forward slashes and one leading `@`, and reply `Acceptance checks are role-tester. Next: new chat, @role-tester @` plus that path. A message `@role-qa Mode B @specs/001-role-tester.md` produces `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`. When the message names no spec path, reply `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/NNN-*.md`.
- If the message does not ask for those jobs, do the requirements review. `@role-qa` or `/role-qa` plus a spec path is enough, including when the message does not contain "Mode A". A normal message that only names the role and a spec path performs the requirements review. Typing "Mode A" is optional and harmless: a message that includes "Mode A" and does not ask for an acceptance check still gets the requirements review. A message that asks only for a requirements review still gets that review when it contains the letters "Mode B", including `@role-qa Review requirements for the Mode B rename in @specs/001-role-tester.md`. Do that review even when the spec file itself contains the words "Mode B". Do not refuse, stall, or ask for a mode name because "Mode A" is missing.

**`.cursor/agents/role-tester.md` (new)**

- Frontmatter `name`: `role-tester`.
- Frontmatter `description`: use when the human invokes `@role-tester` or `/role-tester` for an acceptance check of a spec. Ends with a STOP.
- The body is today's Mode B, under this role:
  - Invoke only for `@role-tester` or `/role-tester`.
  - Do not write Playwright tests. Do not implement the feature. Do not edit source code. Do not edit acceptance criteria. Existing `e2e/` tests and CI stay as they are.
  - Independent from Dev. Always state what could not be verified.
  - Input: the spec and `git diff main`.
  - For each acceptance criterion: **MET** / **NOT MET** / **CANNOT VERIFY**, with evidence (file and line, or real command output). Never claim MET without evidence.
  - Run lint, typecheck, and the existing tests (`npm run lint`, `npm run typecheck`, `npm test`). Report the actual results. Do not add `npm run build` as a new tester requirement.
  - Flag any behavior in the diff that the spec does not mention.
  - Write **Manual verification steps** in the spec: numbered steps the human can run in under 5 minutes (happy path + 2–3 edge cases), each with an expected result. That is the only spec section this role writes. The MET / NOT MET / CANNOT VERIFY report stays in the chat.
  - Do not fix code. Report findings for Dev.
  - Done when the acceptance check and manual steps are written. STOP. Print: `Next: you run the manual steps, then open a PR`.
  - If the message asks for a requirements review and does not ask for an acceptance check, do not run lint, typecheck, or tests, do not edit the spec, and reply with exactly the following text and nothing else, then stop. When the message names a spec path, normalize that path the same way as the QA refusal (forward slashes, `specs/NNN-name.md`, one leading `@`) and reply `Requirements reviews are role-qa. Next: new chat, @role-qa @` plus that path. A message `@role-tester Review requirements for @specs/001-role-tester.md` produces `Requirements reviews are role-qa. Next: new chat, @role-qa @specs/001-role-tester.md`. When the message names no spec path, reply `Requirements reviews are role-qa. Next: new chat, @role-qa @specs/NNN-*.md`.

**`.cursor/agents/role-dev.md`**

- Description and body say the follow-up work is tester findings (the acceptance findings role-tester reported).
- Keep: do not edit the spec's acceptance criteria; if one looks wrong, stop and tell the human.
- Replace "After QA Mode B" with the role-tester acceptance check.
- Done line is exactly: `Next: new chat, @role-tester @specs/NNN-*.md`.
- Keep the rest of the Dev prompt: one spec, one branch, one PR, no new dependency without a PR justification, run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` before saying the implementation is done, and follow the extension hard rules.

**`.cursor/agents/role-spec.md`**

- Step 3 names who fills the blank sections: QA fills **QA review**; role-tester fills **Manual verification steps**. It does not tell the human to type "Mode A".
- Done line is exactly: `Next: new chat, @role-qa @specs/NNN-*.md`.

**`docs/agent-workflow.md`**

- The opening and the role list name Tester as a fourth subagent, invoked with `@role-tester` or `/role-tester`.
- Step 3 is the requirements review via `@role-qa` or `/role-qa` and a spec path. It does not tell the human to type "Mode A".
- Step 5 says that after a later role-tester acceptance check, Dev addresses acceptance findings.
- Step 6 is the tester acceptance check: new chat, `@role-tester` or `/role-tester`, and the spec path. It checks each acceptance criterion against `git diff main`, runs lint, typecheck, and the existing tests, flags unspecified behavior, writes **Manual verification steps**, and does not fix code.
- The "roles are subagents" sentence includes `@role-tester` and `/role-tester`.
- Example prompts keep the sample spec path `specs/001-duplicate-rule.md`. The acceptance-check example is:

  `@role-tester` Acceptance check for `specs/001-duplicate-rule.md` against `git diff main`. Do not fix code. Or `/role-tester` with the same sentence.

- The QA example is:

  `@role-qa` Review requirements for `specs/001-duplicate-rule.md`. Do not implement. Or `/role-qa` with the same sentence.

- "What you still do by hand" says to review the QA requirements-review findings before implementation, and says to run the Manual verification steps after the role-tester acceptance check. It does not tell the human to type "Mode A".
- `qa_findings_accepted` stays the column name in the sentence about `docs/agent-runs.csv`.

**`AGENTS.md`**

- The flow sentence names role-tester for the acceptance check: Spec → QA requirements review → (human) → Dev → role-tester acceptance check → (human: manual test) → PR → CI → merge.
- QA still validates requirements from the user's point of view and does not write Playwright tests. `@role-qa` or `/role-qa` plus a spec path is that requirements review. `AGENTS.md` does not tell the human to type "Mode A". role-tester does the acceptance check, does not write Playwright tests, and does not fix code. Existing `e2e/` tests and CI stay as they are.
- Dev still runs lint, typecheck, build, and test before saying the implementation is done. role-tester runs lint, typecheck, and the existing tests, reports the output, does not fix code, and stops at its handoff. Spec and QA stop at their handoff and do not run that suite.
- The role list is `@role-spec`, `@role-qa`, `@role-dev`, and `@role-tester`, including the matching `/` menu names.

**`.cursor/rules/project-core.mdc`**

- The invoked-role list includes `@role-tester`.
- Allowed writes: Spec → only `specs/*.md`. QA → only the **QA review** section. Tester → only the **Manual verification steps** section. Dev may edit the source files required by the spec and the docs and agent prompts named in that spec's scope as files to change. Dev may not edit the spec's acceptance criteria. A path named only as unchanged, out of scope, or forbidden is not permission to edit it. Anything else: stop and ask the human.
- A message that sounds like a build request ("implement", "build", "add feature") while the invoked role is Spec, QA, or Tester is not a request to implement. For Tester, it is not permission to fix code.
- The "run lint, typecheck, and tests before saying done" gate stays Dev's implementation-done gate. Spec, QA, and Tester are done when their DONE section says so. Tester still runs lint, typecheck, and the existing tests as evidence inside its own prompt; that run is not a second copy of the procedure in this rule, and a failing command does not make Tester edit code.
- This rule does not contain the requirements-review checklist or the MET / NOT MET procedure. It does not tell the human to type "Mode A".

**`specs/_template.md`**

- **QA review** says it is filled by QA before implementation. The note does not tell the human to type "Mode A". The block has no **Mode:** line for QA to announce a mode.
- **Manual verification steps** says it is filled by role-tester after implementation, and stays blank in the spec draft.
- The definition-of-done checkbox for the acceptance check names role-tester, and still says findings are addressed by DEV.
- The requirements-review checkbox says a QA requirements review was completed. It does not say the human typed "Mode A".

### Files searched that stay unchanged

These have no pipeline phrase to retarget: `README.md`, `.github/pull_request_template.md`, `docs/agent-runs.csv` (header only; do not add a row and do not rename columns), `src/`, `public/manifest.json`, `e2e/`, CI workflows, `package.json`.

## Out of scope

- Changing the eight requirements-review checks, the output rules (max 10 findings, suggested rewrites, verdict APPROVE or NEEDS CHANGES, biggest risk, no rubber-stamping), independence from Dev, the Playwright ban, the source-edit ban, or QA's handoff to Dev.
- Adding or editing Playwright tests, `e2e/`, or CI.
- Renaming `MockRule`, storage keys, the bridge message source, or the extension.
- New npm dependencies.
- Any change to extension behavior, popup, options, interceptor, or manifest.
- Renaming the `qa_findings_accepted` column or adding a row to `docs/agent-runs.csv`.
- A second copy of the tester procedure in a `.mdc` rule.
- Restoring `.cursor/rules/role-qa.mdc`, `role-dev.mdc`, or `role-spec.mdc`.

## Acceptance criteria

1. Given the human opens `.cursor/agents/role-qa.md`, when they read the requirements-review instructions, then they see checklist items 1 through 8, the verdict words APPROVE and NEEDS CHANGES, the ban on Playwright tests and on editing source, and the done line `Next: you fix the spec, then new chat, @role-dev @specs/NNN-*.md`. The file does not contain the sentence `State which mode you are in.` The file does not instruct the human to type "Mode A", and it does not instruct QA to announce "Mode A". An internal heading that contains "Mode A", and a refusal condition that mentions those words, may remain.
2. Given the human opens `.cursor/agents/role-qa.md`, when they read the whole file, then the file does not tell QA to perform an acceptance check, to mark criteria MET, NOT MET, or CANNOT VERIFY, or to write **Manual verification steps**. The file may mention those words only inside the refusal that sends those requests to role-tester. The description and the refusal tell a Mode B or acceptance-check request to use role-tester. The description does not say the human must type "Mode A", and it does not say that a missing "Mode A" refuses or stalls the review.
3. Given the human starts a new chat and types `@role-qa Mode B @specs/001-role-tester.md`, when QA replies, then the reply is exactly `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`, and that chat does not edit the spec or any source file and does not run lint, typecheck, or tests.
4. Given the human starts a new chat and types `/role-qa Mode B` with no spec path, when QA replies, then the reply is exactly `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/NNN-*.md`, and that chat does not run an acceptance check.
5. Given the human, in two separate new chats, types `@role-qa @specs/001-role-tester.md` in one and `/role-qa @specs/001-role-tester.md` in the other, and neither message contains "Mode A", "Mode B", or an acceptance-check request, when QA replies in each chat, then each chat performs the requirements review: it writes the **QA review** section, it does not refuse, it does not stall, and it does not ask the human to type a mode. The done line is `Next: you fix the spec, then new chat, @role-dev @specs/001-role-tester.md`. The words "Mode B" inside this spec do not by themselves cause the refusal.
6. Given the human, in two separate new chats, types `@role-qa Mode A @specs/001-role-tester.md` in one and `/role-qa Mode A @specs/001-role-tester.md` in the other, and neither message asks for an acceptance check, when QA replies in each chat, then each chat performs the requirements review and writes the **QA review** section. The extra words "Mode A" do not cause a refusal or a stall, and they are not required.
7. Given the human opens `.cursor/agents/role-tester.md`, when they read it, then the `name` is `role-tester`, the description names `@role-tester` and `/role-tester`, and the body tells the role to judge each acceptance criterion MET / NOT MET / CANNOT VERIFY from `git diff main`, to run `npm run lint`, `npm run typecheck`, and `npm test`, to write only **Manual verification steps**, to avoid source edits and acceptance-criteria edits, to avoid new Playwright tests, and to stop with `Next: you run the manual steps, then open a PR`. The same file tells role-tester that a requirements-review request which does not ask for an acceptance check gets `Requirements reviews are role-qa. Next: new chat, @role-qa @` plus the spec path, with no lint, typecheck, tests, or spec edit.
8. Given the human opens `.cursor/agents/role-dev.md`, when they read the done line, then it is `Next: new chat, @role-tester @specs/NNN-*.md`. The prompt tells Dev to address tester acceptance findings and not to edit acceptance criteria.
9. Given the human opens `.cursor/agents/role-spec.md`, when they read the done line, then it is `Next: new chat, @role-qa @specs/NNN-*.md`. That line does not contain "Mode A". Step 3 says QA fills **QA review** and role-tester fills **Manual verification steps**.
10. Given the human opens `docs/agent-workflow.md`, when they read the example prompts, then the acceptance-check example starts with `@role-tester`, mentions `/role-tester`, uses the sample path `specs/001-duplicate-rule.md`, and says not to fix code. The QA example is `@role-qa` Review requirements for `specs/001-duplicate-rule.md`. Do not implement. It also mentions `/role-qa` with that same sentence, and it does not contain "Mode A".
11. Given the human opens `docs/agent-workflow.md`, when they read steps 3, 5, and 6 and the "by hand" list, then step 3 tells them to type `@role-qa` or `/role-qa` for the requirements review and does not tell them to type "Mode A", step 6 tells them to type `@role-tester` or `/role-tester` for the acceptance check, step 5 says Dev addresses findings from that check, and the by-hand list says to review the QA requirements-review findings before implementation and to run Manual verification steps after the role-tester acceptance check.
12. Given the human opens `AGENTS.md` and `.cursor/rules/project-core.mdc`, when they read the role lists, then both name `@role-spec`, `@role-qa`, `@role-dev`, and `@role-tester`. `AGENTS.md` also names `/role-tester`. The flow sentence in `AGENTS.md` gives the acceptance check to role-tester. `AGENTS.md` says `@role-qa` or `/role-qa` with a spec path is the requirements review. Neither file tells the human to type "Mode A" to start that review. `AGENTS.md` says role-tester runs lint, typecheck, and the existing tests, reports the output, does not fix code, and stops at its handoff, and that Spec and QA do not run that suite.
13. Given the human opens `.cursor/rules/project-core.mdc`, when they read allowed writes, then QA may write only the **QA review** section, Tester may write only the **Manual verification steps** section, and Dev may edit the source files required by the spec and the docs and agent prompts named in that spec's scope as files to change. Dev may not edit the spec's acceptance criteria. A path named only as unchanged, out of scope, or forbidden is not permission to edit it. The requirements-review checklist and the MET / NOT MET steps are not in this file. The file says Spec, QA, and Tester are done when their DONE section says so, that Tester's command run is evidence and a failing command does not let Tester edit code, and that a message that says implement, build, or add feature does not let Tester fix code.
14. Given the human opens `specs/_template.md`, when they read **QA review**, **Manual verification steps**, and the definition of done, then the QA review note says QA fills that section before implementation and does not tell the human to type "Mode A", that block has no **Mode:** line, the manual-steps note says role-tester fills that section after implementation, the acceptance-check checkbox names role-tester, and the requirements-review checkbox says a QA requirements review was completed and does not say the human typed "Mode A".
15. Given the human looks for `.cursor/rules/role-qa.mdc`, `.cursor/rules/role-dev.mdc`, `.cursor/rules/role-spec.mdc`, and `.cursor/rules/role-tester.mdc`, when this PR is complete, then those four files are absent.
16. Given the human inspects the PR diff for `src/`, `public/manifest.json`, `e2e/`, CI workflows, and `package.json`, when they compare it with the pipeline files above, then those product and test paths have no edits from this work and `package.json` has no new dependency.
17. Given the human types `@role-qa Review requirements for the Mode B rename in @specs/001-role-tester.md` and does not ask for an acceptance check, when QA replies, then that chat writes **QA review** and does not use the refusal reply.
18. Given the human types `@role-qa Write the Manual verification steps for @specs/001-role-tester.md` and does not type `Mode B`, when QA replies, then the reply is `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`, and that chat does not edit a file and does not run lint, typecheck, or tests.
19. Given the human types `@role-qa Mode A and an acceptance check for @specs/001-role-tester.md`, when QA replies, then the reply is `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`, and that chat does not write **QA review**.
20. Given the human types `@role-tester Review requirements for @specs/001-role-tester.md`, when role-tester replies, then the reply is `Requirements reviews are role-qa. Next: new chat, @role-qa @specs/001-role-tester.md`, and that chat does not edit a file and does not run lint, typecheck, or tests.

## Edge cases

- The human's QA message asks for a requirements review and also asks for Mode B, an acceptance check, marking criteria, or **Manual verification steps**. The chat uses the refusal reply and does not write **QA review**. The letters "Mode A" or "Mode B" in a requirements-review-only message do not refuse.
- The human asks `@role-qa` to "acceptance check" or to "write Manual verification steps" without typing the characters `Mode B`. The same refusal runs.
- The human types `@role-qa` or `/role-qa` plus a spec path, and does not type "Mode A". QA does the requirements review. It does not refuse, stall, or ask the human to name a mode. This includes a spec whose body contains "Mode B", and a request that mentions the Mode B rename while asking only for a requirements review.
- The human types "Mode A" with `@role-qa` or `/role-qa` and a spec path, and does not ask for an acceptance check. QA does the requirements review. The extra words are harmless and are not required.
- The human invokes `@role-tester` or `/role-tester` and also says "implement" or "fix the code". Tester reports findings and does not edit source or acceptance criteria.
- The human asks `@role-tester` for a requirements review and does not ask for an acceptance check. Tester does not run lint, typecheck, or tests, does not edit the spec, and replies with the role-qa redirect.
- role-tester's `npm test` fails or cannot run. Tester reports the actual output, uses CANNOT VERIFY or NOT MET as the evidence requires, and does not fix the failure.
- An acceptance criterion looks wrong to Dev or to Tester. Neither role edits it. They stop and tell the human.
- `project-core.mdc` is updated but an agent prompt still says `@role-qa Mode B`, or the reverse. That is a failed change: the files in Scope must agree on who owns the acceptance check.
- The three HEAD `.mdc` role files are not a second copy to keep in sync. Putting their old "QA writes Playwright tests" text back, or copying role-tester into a new `.mdc`, is a failed change.

## Test notes

No options page, popup, or fixture page. This change does not appear in the unpacked extension.

The human checks it by opening the files named in the acceptance criteria and by starting the chats in criteria 3, 4, 5, 6, 17, 18, 19, and 20. Run criteria 5, 6, and 17 on a copy of this spec. Running them on this file replaces **QA review**. If you use this file, copy this verdict aside first and put it back afterward if you still want it here. Criterion 5 is `@role-qa @specs/001-role-tester.md` and `/role-qa @specs/001-role-tester.md` with no mode word. Criterion 6 adds the words "Mode A" and still expects a requirements review. Criteria 3 and 4 need a QA chat whose message asks for Mode B. Criteria 18 and 19 need a QA chat that asks for an acceptance-check job. Criterion 20 needs a role-tester chat that asks for a requirements review. A later `@role-tester` acceptance-check chat on this spec is how the human sees Manual verification steps get filled.

## Assumptions

- The user does not want to mention Mode A. role-qa always does the requirements review. `@role-qa` or `/role-qa` plus a spec path is enough. Typing "Mode A" is optional and harmless. Omitting those words is not a failure.
- "Renamed" means Mode B moves. It is not copied. role-qa keeps the requirements review as it is now (same eight checks, same output rules, same independence from Dev, same ban on Playwright tests and source edits, same handoff to Dev), and it drops the instruction to state which mode it is in. Mode B is removed from role-qa so acceptance checking has one owner. role-tester does what Mode B does today, under `@role-tester` and `/role-tester`, including the same evidence rules, the same commands, the same **Manual verification steps** section, and the same refusal to fix code, and it adds the requirements-review redirect in the role-tester scope. Dev's post-implementation handoff changes from `@role-qa Mode B` to `@role-tester`. Dev still addresses tester findings and still must not change acceptance criteria. The spec role's handoff is `Next: new chat, @role-qa @specs/NNN-*.md`. The QA prompt may keep an internal heading for the requirements review. The human never types that heading, and QA does not announce "Mode A".
- The baseline is the working tree read for this spec (agent prompts under `.cursor/agents/`, the current `docs/agent-workflow.md`, `AGENTS.md`, `project-core.mdc`, and `specs/_template.md`). git HEAD still has the older "QA writes Playwright tests" rules and does not have `.cursor/agents/`. Dev does not revert the working-tree pipeline back to that HEAD text.
- The refusal reply is exactly those two sentences, including the period after `role-tester`. When the message names a spec path, that path is normalized to `specs/NNN-name.md` with forward slashes and one leading `@`. When it names no spec path, the reply is `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/NNN-*.md`. The refusal is triggered by the job the chat message asks for, not by the spec body, and not by the letters "Mode B" inside a requirements-review-only message.
- Tester reports MET / NOT MET / CANNOT VERIFY in the chat. It does not add a new spec section for that report.
- Tester runs `npm run lint`, `npm run typecheck`, and `npm test`, matching Mode B's "lint, typecheck, and the existing tests." It does not gain a required `npm run build`.
- The workflow example keeps the sample path `specs/001-duplicate-rule.md`.
- `docs/agent-runs.csv` is unchanged. No row is added. The `role` column can later say `role-tester`. The column `qa_findings_accepted` keeps its name.
- Dev may edit the source files required by the spec and the docs and agent prompts named in that spec's scope as files to change. Dev may not edit the spec's acceptance criteria. A path named only as unchanged, out of scope, or forbidden is not permission to edit it.
- QA findings 1 through 8 were accepted. The scope, acceptance criteria, edge cases, test notes, and assumptions are the updated text. The QA review section stays as the record of that review.
- A requirements-review message to role-qa that names no spec path gains no new refusal from this change. role-tester's requirements-review redirect has its own no-path reply: `Requirements reviews are role-qa. Next: new chat, @role-qa @specs/NNN-*.md`.
- No clarifying questions were asked. The points above are the gaps this spec settles.

## QA review

Filled by QA before implementation (requirements review). The human does not type Mode A.

**Verdict:** NEEDS CHANGES

**Biggest risk:** The refusal the human depends on is specified twice, and the two copies disagree. Criterion 2 can reject a `role-qa.md` that contains the required refusal. The words "exactly one sentence" can cut off the handoff the human pastes into the next chat.

**Findings:**

1. [High] Criterion 2 can fail a correct `role-qa.md`. Scope tells that file to mention MET, NOT MET, CANNOT VERIFY, and **Manual verification steps** inside the refusal. Criterion 2 says the file has no instructions to mark criteria or to write **Manual verification steps**. Criterion 1 already allows a refusal to mention "Mode A". Criterion 2 does not give the same allowance. The later acceptance check can reject the file either for containing those words or for omitting them.
   Suggested rewrite: Replace criterion 2 with: Given the human opens `.cursor/agents/role-qa.md`, when they read the whole file, then the file does not tell QA to perform an acceptance check, to mark criteria MET, NOT MET, or CANNOT VERIFY, or to write **Manual verification steps**. The file may mention those words only inside the refusal that sends those requests to role-tester. The description and the refusal tell a Mode B or acceptance-check request to use role-tester. The description does not say the human must type "Mode A", and it does not say that a missing "Mode A" refuses or stalls the review.

2. [High] The refusal reply the human must see is two sentences, and the scope text also says "exactly one sentence". Assumption "The refusal sentence is exactly…" calls that same two-sentence text one sentence. A prompt that keeps both constraints can stop after `Acceptance checks are role-tester.` and drop `Next: new chat, @role-tester @…`, which is the line the human copies.
   Suggested rewrite: In the `.cursor/agents/role-qa.md` refusal bullet, replace "Reply with exactly one sentence and stop" and the following path rules with: Reply with exactly the following text and nothing else, then stop. When the message names a spec path, normalize that path to `specs/NNN-name.md` with forward slashes and one leading `@`, and reply `Acceptance checks are role-tester. Next: new chat, @role-tester @` plus that path. A message `@role-qa Mode B @specs/001-role-tester.md` produces `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`. When the message names no spec path, reply `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/NNN-*.md`. In Assumptions, replace "The refusal sentence is exactly…" with: The refusal reply is exactly those two sentences, including the period after `role-tester`.

3. [Med] Any chat message that contains the letters `Mode B` is refused, including a requirements review about this rename. The human can type `@role-qa Review requirements for the Mode B rename in @specs/001-role-tester.md` and get no **QA review**. The same chat is the one this spec is for. Words inside the spec file are already excluded. Words in the typed request are not.
   Suggested rewrite: Replace the refusal trigger in the `.cursor/agents/role-qa.md` bullets and the matching edge case with this closed list. Refuse when the human asks QA to do any of these jobs: run Mode B, run an acceptance check, mark criteria MET / NOT MET / CANNOT VERIFY, or write **Manual verification steps**. Also refuse when the message asks for a requirements review and for one of those jobs in the same chat. Still run the requirements review when the message asks only for that review, even if it contains the letters "Mode A" or "Mode B". Add an acceptance criterion: Given the human types `@role-qa Review requirements for the Mode B rename in @specs/001-role-tester.md` and does not ask for an acceptance check, when QA replies, then that chat writes **QA review** and does not use the refusal reply.

4. [Med] The jobs the human is likely to type after this change are specified in scope and then left out of the acceptance criteria. Criteria 3 and 4 lock only the words `Mode B`. A later acceptance check can pass while `@role-qa` still runs an acceptance check for `acceptance check` or `write Manual verification steps`, and while one chat that asks for both a requirements review and an acceptance check still writes **QA review**.
   Suggested rewrite: Add these criteria. Given the human types `@role-qa Write the Manual verification steps for @specs/001-role-tester.md` and does not type `Mode B`, when QA replies, then the reply is `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`, and that chat does not edit a file and does not run lint, typecheck, or tests. Given the human types `@role-qa Mode A and an acceptance check for @specs/001-role-tester.md`, when QA replies, then the reply is that same text, and that chat does not write **QA review**.

5. [Med] Dev's allowed-writes line changes for every future spec, from "source files required by the spec" to "the files the spec lists". This spec names `src/`, `e2e/`, `package.json`, and the old `.mdc` paths as files that must stay untouched, so "lists" does not tell Dev which names are permission. A later feature spec that does not enumerate paths would make Dev stop and ask before editing the product files it edits today.
   Suggested rewrite: In the `project-core.mdc` bullet, in criterion 13, and in the assumption that explains the Dev write line, use: Dev may edit the source files required by the spec and the docs and agent prompts named in that spec's scope as files to change. Dev may not edit the spec's acceptance criteria. A path named only as unchanged, out of scope, or forbidden is not permission to edit it.

6. [Med] Two always-on instructions the human will hit are in scope and in no acceptance criterion. `AGENTS.md` must say role-tester runs lint, typecheck, and the existing tests, reports the output, does not fix code, and stops at its handoff, and that Spec and QA do not run that suite. `project-core.mdc` must say Spec, QA, and Tester are done when their DONE section says so, that Tester's command run is evidence and a failure does not let Tester edit code, and that a message that says implement, build, or add feature does not let Tester fix code. Criteria 12 and 13 can pass while those sentences still describe today's QA-only pipeline. Tester would then be told to pass the suite before it may stop, and also told not to fix a failure.
   Suggested rewrite: Add the two sentences above to criteria 12 and 13 so each is checked by opening that file.

7. [Low] `@role-qa` sends an acceptance-check request to role-tester. `@role-tester` has no matching redirect. The human who asks role-tester for a requirements review gets lint, typecheck, tests, and a write to **Manual verification steps** on a spec that is not implemented yet.
   Suggested rewrite: In the `role-tester.md` scope bullets, add: If the message asks for a requirements review and does not ask for an acceptance check, do not run lint, typecheck, or tests, do not edit the spec, and reply `Requirements reviews are role-qa. Next: new chat, @role-qa @` plus the spec path, or `@specs/NNN-*.md` when the message names no path. Then stop. Add a criterion for `@role-tester Review requirements for @specs/001-role-tester.md` that expects that reply and no file edit.

8. [Low] Test notes say criteria 5 and 6 can use this spec. Those chats write **QA review** again and replace this verdict. The human can lose the accepted review while checking the new prompt.
   Suggested rewrite: In Test notes, replace the criteria 5 and 6 sentences with: Run criteria 5 and 6 on a copy of this spec. Running them on this file replaces **QA review**. If you use this file, copy this verdict aside first and put it back afterward if you still want it here.

**Not verified:** No second chat was opened, so the live Mode B reply and the live refusal were not observed. The `/` menu entry for role-tester does not exist yet. The working-tree prompts, `docs/agent-workflow.md`, `AGENTS.md`, `project-core.mdc`, `specs/_template.md`, and the deleted role rule files at git HEAD were read, and they match this spec's description of today. `README.md` and `.github/` do not mention Mode A, Mode B, or `@role-qa`.

## Manual verification steps

Filled by role-tester after implementation. These checks stay in the files and in short chats. They do not use the unpacked extension.

1. Open `.cursor/agents/role-qa.md`, `.cursor/agents/role-tester.md`, `.cursor/agents/role-dev.md`, `.cursor/agents/role-spec.md`, and the example prompts in `docs/agent-workflow.md`.
   Expected: role-qa shows checklist items 1 through 8, the words APPROVE and NEEDS CHANGES, and the done line `Next: you fix the spec, then new chat, @role-dev @specs/NNN-*.md`. It has no Mode B procedure and does not tell you to type "Mode A". role-tester's done line is `Next: you run the manual steps, then open a PR`. role-dev's done line is `Next: new chat, @role-tester @specs/NNN-*.md`. role-spec's done line is `Next: new chat, @role-qa @specs/NNN-*.md` and does not contain "Mode A". The workflow acceptance-check example starts with `@role-tester`, uses `specs/001-duplicate-rule.md`, says not to fix code, and mentions `/role-tester`. The QA example is `@role-qa` Review requirements for `specs/001-duplicate-rule.md`. Do not implement. and mentions `/role-qa`.

2. In two new chats, send `@role-qa Mode B @specs/001-role-tester.md` in one and `/role-qa Mode B` with no spec path in the other.
   Expected: the first reply is exactly `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`. The second reply is exactly `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/NNN-*.md`. Neither chat edits a file, runs lint, typecheck, or tests, or writes **QA review**.

3. In a new chat, send `@role-qa Write the Manual verification steps for @specs/001-role-tester.md` and do not type `Mode B`.
   Expected: the reply is exactly `Acceptance checks are role-tester. Next: new chat, @role-tester @specs/001-role-tester.md`. That chat does not edit a file and does not run lint, typecheck, or tests.

4. In a new chat, send `@role-tester Review requirements for @specs/001-role-tester.md` and do not ask for an acceptance check.
   Expected: the reply is exactly `Requirements reviews are role-qa. Next: new chat, @role-qa @specs/001-role-tester.md`. That chat does not edit a file and does not run lint, typecheck, or tests.

## Definition of done

- [ ] Spec accepted by the human
- [ ] QA requirements review completed; findings accepted or spec updated
- [ ] DEV implemented the spec without changing the acceptance criteria
- [ ] role-tester acceptance check completed; findings addressed by DEV
- [ ] Human ran the Manual verification steps
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` were run and the output is in the PR
- [ ] Human reviewed and merged the PR
- [ ] A row was added to `docs/agent-runs.csv`
