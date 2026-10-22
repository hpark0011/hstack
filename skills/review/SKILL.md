---
name: review
description: >
  Read-only review of the current change for implicit assumptions, hidden
  couplings, scattered responsibilities, and mixed responsibilities. Use when
  the user asks for a review, or /ship starts. Records findings and does not
  edit. Differs from /resolve, which fixes a review record, and from /scope,
  which judges whether the diff should stay one change.
---

# Review

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Do not edit, commit, push, or open a pull request.

Name the requirement from the user request, the spec under `paths.specs`, or the ticket. If you cannot name it, stop.

Review the diff against `default_branch`: commits since the merge-base, staged files, unstaged files, and untracked files that belong to this change. Follow files listed in `rules` when judging.

## Lenses

Record each lens. These definitions are the ones `/scope` and `/resolve` use.

- Assumptions: behavior the change relies on that no type, test, or name states.
- Couplings: a change in one file that silently requires a change elsewhere which the diff does not show as one responsibility.
- Scattered: one responsibility split across owners that should be one owner.
- Mixed: one owner doing several unrelated jobs.

A finding is supported only when you can point at the code. An unsupported hunch is recorded as unsupported and is not a defect.

Keep this record in the conversation. Do not write it into the repo unless the user asks.

```
requirement: <one line>
lenses:
  assumptions: none | <one line>
  couplings: none | <one line>
  scattered: none | <one line>
  mixed: none | <one line>
findings:
  - id: R1
    lens: assumptions
    supported: yes
    where: <path>
    note: <one line>
```

If there are no findings, say so in the record. Coverage is incomplete when you have not looked at the full diff.

If the user invoked you directly, one short message: the supported findings, or that there are none. If `/ship`, `/resolve`, or `/scope` called you, return the record and do not speak.
