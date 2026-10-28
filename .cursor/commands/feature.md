---
description: Orchestrate spec, QA, dev, and tester for one feature, push the feature branch, and stop for review.
---

# /feature

The text after `/feature` is the feature idea. You are the main agent. You orchestrate. Launch the role subagents and wait for each one to finish. Do the git steps and the run-log row yourself. Do not write the spec, fill **QA review**, implement the feature, or mark acceptance criteria. Do not edit acceptance criteria yourself.

This command is the authorization for the whole pipeline. Do not stop to ask which role, to ask for another plan, or to ask the human to approve the next role. Record gaps as assumptions inside the spec step. Stop only for a precondition failure, a failed launch, a round limit, or a rule below.

Launch subagents with the Task tool, one at a time, `subagent_type` `role-spec`, `role-qa`, `role-dev`, or `role-tester`. Wait for the subagent to finish before the next launch. If the Task tool is unavailable, stop and report. Do not do that role's work in this chat.

Ignore a role's "Next: new chat" handoff. A role subagent must not launch another role. You launch the next one. Each task prompt starts with the `@role-...` invocation so the role accepts the job, and tells that role not to commit, push, or open a PR. If a role stops to ask the human a question, stop the pipeline and report the question. Do not answer it.

Read `AGENTS.md` before any git write. Never read or write `.env` files or secrets. Do not open secret files to classify them; judge by filename. Never add a dependency the spec does not require. Never claim lint, typecheck, build, or test passed unless the subagent result includes that command's output and a success exit. "All passed" without output is not success. Do not re-run the suite yourself.

An early stop commits nothing and pushes nothing. Report the step, the round counts, the failing output or findings, and the spec path if the spec file exists.

## 0. Preconditions

1. If `git status --porcelain` prints anything, including untracked files, stop. Do not stash.
2. List `specs/*.md`. Skip `specs/_template.md`. `NNN` is one plus the highest three-digit prefix, zero-padded to 3. If none exist, `NNN` is `001`.
3. Build a slug from the idea: lowercase, letters and digits, words separated by single hyphens, no leading or trailing hyphen, at most 40 characters.
4. The branch is `feat/NNN-slug`. The spec path is `specs/NNN-slug.md`. If that branch already exists, or that file exists, stop.
5. If local `main` does not exist, stop. Do not fetch or pull.
6. From the clean tree, check out local `main`, then `git checkout -b feat/NNN-slug`. A clean checkout that is already `main` is allowed. Do this before any role launch.
7. If `HEAD` is not `feat/NNN-slug`, stop. Do not commit or push on `main`.

## 1. Spec

Launch `role-spec` once. Task prompt:

> You are invoked with `@role-spec`. Write only `specs/NNN-slug.md` for this idea: `<idea>`. Copy `specs/_template.md`. Fill every section except **QA review** and **Manual verification steps**. Do not ask questions. State assumptions in the spec and finish. Do not implement. Do not commit, push, or open a PR. Touch no other file.

If the subagent fails, or `specs/NNN-slug.md` is missing, or a different spec file was created, stop.

## 2. QA — maximum 2 rounds

A round is one `role-qa` requirements review. The spec file's **QA review** section is the verdict source. If the chat summary and the file disagree, use the file. If the file has no **APPROVE** or **NEEDS CHANGES** verdict, stop. Do not invent a verdict.

Launch prompt, every round:

> You are invoked with `@role-qa`. Requirements review only of `specs/NNN-slug.md`. Write the **QA review** section. Rank findings High, Med, or Low, each with a suggested rewrite. On a repeat review, mark every earlier finding `resolved` or `still open`. Set the verdict to **APPROVE** or **NEEDS CHANGES**. State the biggest risk. Do not run an acceptance check. Do not mark criteria MET, NOT MET, or CANNOT VERIFY. Do not write **Manual verification steps**. Do not implement. Do not edit acceptance criteria. Do not commit, push, or open a PR.

- Round 1 is the review of the new spec.
- **APPROVE** on round 1: go to Dev. Do not revise.
- **NEEDS CHANGES** on round 1: launch `role-spec` to revise that same file, then run QA round 2. Revision prompt:

> You are invoked with `@role-spec`. Revise only `specs/NNN-slug.md` to address these High and Medium findings: `<findings>`. You may edit acceptance criteria only to address those findings. Leave Low findings in place unless a High or Medium rewrite requires a wording change. Do not ask questions. Do not implement. Do not commit, push, or open a PR. Touch no other file.

- Round 2 is the last QA review. Do not launch a third.
- After round 2, read the findings. A High finding is still open unless that finding's rank line is marked `resolved` (the status next to the rank, such as `[High] resolved`). The word `resolved` inside a suggested rewrite does not close it. A High entry with no status, or marked `still open`, is open. If any High finding is still open, stop before Dev. Do not implement.
- Medium and Low findings that remain do not block Dev. Carry them into the PR description.
- If a QA launch changes the **Acceptance criteria** section, stop. Only a `role-spec` launch may change that section. Do not restore it yourself.

QA rounds used is 1 or 2.

## 3. Dev — maximum 3 attempts

Attempt 1 is the first implementation. Attempts 2 and 3 are re-launches with the failure output. These three attempts are only for getting the checks green before the first tester run. Tester fix rounds do not consume them.

Launch `role-dev`. First-attempt prompt:

> You are invoked with `@role-dev`. Implement `specs/NNN-slug.md`. Do not stop to ask the human to approve a plan. Do not edit the acceptance criteria. If one looks wrong, stop and tell the human. Do not add a dependency the spec does not require. Do not commit, push, or open a PR. Before done, run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`. Paste each command's output and exit status. List what you did not verify.

A re-launch prompt adds: this is attempt N of 3, here is the failing output, fix the implementation, then run the same four commands again and paste the output.

Green means the result includes output for all four commands and `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` each exited 0. `npm test` needs a successful `npm run build` first. A failed or missing build is a failed attempt. Missing output is a failed attempt.

If `role-dev` says an acceptance criterion looks wrong, stop the pipeline and report. Do not patch the criteria.

After each Dev launch, if `package.json` or `package-lock.json` changed and the spec does not require that dependency, stop. Do not commit. If the **Acceptance criteria** section changed during a Dev launch, stop. Do not restore it yourself.

If attempt 3 is not green, stop and report the last output.

## 4. Tester — maximum 2 fix rounds

Launch `role-tester`. Prompt:

> You are invoked with `@role-tester`. Acceptance check for `specs/NNN-slug.md` against `git diff main`. For each acceptance criterion report MET, NOT MET, or CANNOT VERIFY with evidence. Run `npm run lint`, `npm run typecheck`, and `npm test`, and paste the output. Do not add a build requirement of your own. Flag behavior in the diff that the spec does not mention. Write **Manual verification steps** only. Do not fix code. Do not edit acceptance criteria. Do not commit, push, or open a PR.

`CANNOT VERIFY` does not start a fix. Unspecified behavior does not start a fix. Record both for the PR description.

If the latest tester report contains any NOT MET, and fewer than 2 fix rounds have been used, start a fix round.

A fix round is one `role-dev` launch with the NOT MET findings, then, only if that launch is green by the same output rule as section 3, one `role-tester` launch. Fix-round Dev prompt:

> You are invoked with `@role-dev`. Address these acceptance findings for `specs/NNN-slug.md`: `<findings>`. Do not stop to ask the human to approve a plan. Do not edit acceptance criteria. Do not add a dependency the spec does not require. Do not commit, push, or open a PR. Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`. Paste each command's output and exit status. List what you did not verify.

If that Dev launch is not green, do not launch tester. The fix round is used. If a fix round remains, launch `role-dev` again with the failing output and the same findings. If that later launch is green, run tester. If none remain, stop.

If tester still reports any NOT MET after 2 fix rounds, stop and report. Do not start a third fix round.

Fix rounds used is the number of these Dev fix launches, from 0 to 2.

Apply the section 3 dependency and acceptance-criteria checks after every Dev launch in this section. If tester changes the **Acceptance criteria** section, stop. Do not restore it yourself.

If tester fails to return a per-criterion report, stop. Do not mark criteria MET yourself.

## 5. Commits and push

Run this section only when the latest tester report has no NOT MET.

If `HEAD` is not `feat/NNN-slug`, stop. If `role-dev` already made commits, stop and report. Do not amend, reset, or push them.

Before committing, inspect `git status`, `git diff`, and recent `git log` messages. Match that message style in one or two sentences about why.

- Commit 1: `specs/NNN-slug.md` only. It already includes **QA review** and **Manual verification steps**.
- Commit 2: the implementation, including rebuilt `dist/` when the build changed it. Do not stage `specs/NNN-slug.md` again.

If commit 2 would be empty, stop. Do not push.

Do not stage `.env`, `.env.*`, `credentials.json`, `*.pem`, `*.key`, or any other secret filename. If a secret path is in the status list, stop before that commit. Do not open the file.

Do not update git config. Do not skip hooks. Do not use `git commit --amend` or interactive git. On PowerShell, pass the message with a here-string:

```powershell
git commit -m @"
Message here.

"@
```

Push only when both commits succeeded and `HEAD` is `feat/NNN-slug`:

```powershell
git push -u origin HEAD:feat/NNN-slug
```

Never push `main`. Never force-push. Never merge. Never open a PR. Do not run `gh pr create`. If this push fails, stop and report the error. Do not append the run-log row, and do not print the ready line.

## 6. PR description

Print a ready-to-paste PR description with these sections:

- **Spec** — `specs/NNN-slug.md` and branch `feat/NNN-slug`
- **QA review** — verdict, QA rounds used, unresolved findings (including Medium and Low)
- **Tester report** — each criterion as MET, NOT MET, or CANNOT VERIFY, with the evidence the tester gave
- **Manual verification steps** — the numbered steps now in the spec
- **Not verified** — everything Dev or Tester listed, plus that you did not re-run the suite and did not run the manual steps
- **Deviations from the spec** — unspecified behavior the tester flagged, and assumptions the spec records. If there are none, write "None." Then say whether the spec required a new dependency. If it did, include the justification. If it did not, write that no dependency was added.
- **Loop rounds** — QA rounds, Dev attempts, tester fix rounds

## 7. Run log

Append one row to `docs/agent-runs.csv`. Columns, in order:

`date,task,role,model,duration_min,cost_estimate_eur,ci_passed_first_try,human_corrections,qa_findings_accepted,notes`

- `date`: today's date, `YYYY-MM-DD`
- `task`: the slug
- `role`: `pipeline`
- `model`: the model id only if you know it. Otherwise empty
- `duration_min`, `ci_passed_first_try`, `human_corrections`, `qa_findings_accepted`: empty
- `cost_estimate_eur`: empty
- `notes`: QA verdict, QA rounds, Dev attempts, tester fix rounds, and whether any findings remain

Quote a field that contains a comma or a double quote. Double any internal quotes. Do not invent duration, cost, CI, or human corrections.

Commit only `docs/agent-runs.csv` on `feat/NNN-slug`, then push that branch again:

```powershell
git push origin HEAD:feat/NNN-slug
```

If the commit or the push fails, report the failure. Do not print the ready line.

## 8. Stop

When the log commit is on the remote feature branch, end with this line and nothing after it:

Ready for your review.
