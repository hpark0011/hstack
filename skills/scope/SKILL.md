---
name: scope
description: >
  Judge whether the current diff is one justified change or a coupling and
  modularization problem. Use when the user asks if the file count is
  justified, or /ship reaches the scope step. May repair one smeared
  responsibility, and stops when the diff is two ships. Differs from /review,
  which lists findings, and from /simplify, which keeps behavior and only
  reduces local complexity.
---

# Scope

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Compare the full diff with the requirement: the user request, the spec, or the ticket. The diff is commits since the merge-base with `default_branch`, plus staged files, unstaged files, and untracked files that belong to this change. If you cannot name the requirement, stop.

Count the files and the directories they span. A file count by itself is not a failure.

Use the four lenses in the review record. [review](../review/SKILL.md) defines them. If that record does not cover them, read and follow review once, read-only, before judging. Do not run resolve.

- Every file is required by the requirement, or by one ownership move: keep a one-paragraph justification for the caller.
- One responsibility is smeared across owners: fix that modularization in this change, count again, and follow [verify](../verify/SKILL.md) for the repair.
- The diff is two independent ships: stop and ask. Do not pick a half to delete.

Do not open a pull request. Do not commit. Leave a modularization repair in the working tree so `/ship` can commit it in the rebase step. When the user invoked you directly, say the repair is uncommitted.

If the user invoked you directly, one short message: the file count, the justification or the split, and whether you edited. If `/ship` called you, return that record and do not speak.
