---
name: ship
description: >
  Take implemented work on the current branch to a merged-ready pull request.
  Use only when the user invokes /ship (plugin form: /hstack:ship), or when
  /hstack selects it. Runs review, resolve, scope, simplify, verify, rebase,
  open the pull request, and comment on the linked ticket. Does not start when
  implementation or verification finishes. Differs from /review and /resolve,
  which do not publish, from /pr, which only opens a request, and from /plan,
  which stops at tickets.
disable-model-invocation: true
---

# Ship

Run the pipeline below once, in order, on the current checkout. Do not narrate stages. Speak only for an early stop, or once at the end.

`/ship` and `/hstack:ship` are the same invocation.

Read `.hstack/config.yaml`. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

If this checkout is `default_branch`, stop. Do not implement or publish from it.

Do not auto-start this skill from a hook or a task-board move.

## Gates you must not weaken

Follow each skill you load. Do not rewrite its rules here.

- [review](../review/SKILL.md) does not edit. [resolve](../resolve/SKILL.md) does not commit, push, merge, or delete a worktree. This skill authorizes a path-scoped commit and publication only in the rebase and publish steps.
- After steps 1-4 settle, follow [verify](../verify/SKILL.md) once, unless this tree already has a verification verdict since the last edit. Re-run a check only when a later edit invalidates it. Do this before the pre-rebase commit.
- Leave the repo's hooks in force. Do not create skip sentinels. Do not set any name listed in `ship.forbidden_env`.
- Commits are `git commit -- <paths>` for paths you inspected and this change owns. No stash, no hard reset, no force-push of `default_branch`.

Stop and ask, then do not continue, only when:

- the requirement needs a product decision you cannot settle from the request, the task, or the code
- verification fails and the repair is outside this change
- resolve leaves a supported finding open, or review coverage is incomplete
- a git step would discard work, rewrite `default_branch`, or force-push any branch other than this feature branch after the rebase below
- the checkout is `default_branch`
- the scope check says the change should be split

Name what finished, what did not run, and the decision you need.

## 1. Review

Read and follow [review](../review/SKILL.md). Keep its record. Do not start another review later in this pipeline.

## 2. Resolve

Read and follow [resolve](../resolve/SKILL.md) on that record.

## 3. Scope

Read and follow [scope](../scope/SKILL.md).

## 4. Simplify

Read and follow [simplify](../simplify/SKILL.md).

## 5. Verify

Read and follow [verify](../verify/SKILL.md).

## 6. Rebase

Commit this change's remaining uncommitted paths so the tree is clean. Fetch. Rebase onto the branch named by `default_branch`. Resolve conflicts using both sides. When `rebase.conflict_prompt` is set, follow that file while resolving. If a conflict is a product choice, stop. If the resolution changes behavior, run verify again.

After a rebase of this feature branch, push only that branch to its own upstream (`git push -u origin HEAD` on the first push; `git push --force-with-lease` when the remote branch already exists). Never push `default_branch`. Stop if the lease is rejected or the commits being rewritten are not this change. Do this before opening the pull request: a publish step that pushes without `--force` will reject a rebased branch that is already on the remote.

## 7. Open the pull request

Read and follow [pr](../pr/SKILL.md). Do not make further product edits in this step.

## 8. Comment on the linked ticket

Read and follow [ticket-comment](../ticket-comment/SKILL.md).

## Final message

One short message: the pull request link, the verification verdict, and any open decisions. No stage log.
