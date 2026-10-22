---
name: implement
description: >
  Implement the current ticket or spec on a feature branch. Use when the user
  asks to build it, or /hstack finds a ticket and no diff. Writes the code and
  stops. Does not review, simplify, verify, or open a pull request. Differs
  from /plan, which stops at tickets, and from /ship, which starts only after
  the code exists.
---

# Implement

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Read the ticket the user named and the spec it points at. If there is no ticket and no spec, stop and tell the user to run `/plan`. Do not invent the product.

If this checkout is `default_branch`, create a feature branch and switch to it before the first edit. Do not implement on `default_branch`. If the user asked for a worktree, create the branch there. Do not push. Do not open a pull request. Do not run review, scope, simplify, or verify.

Follow files listed in `rules`, then `AGENTS.md` and `CLAUDE.md` at the repo root when they exist. Implement the ticket only.

A path-scoped commit on the feature branch is allowed (`git commit -- <paths>` for paths you inspected). No stash, no hard reset, no commit on `default_branch`.

If the user invoked you directly, one short message: the branch, the ticket id, and what changed. If `/hstack` called you, return that record and do not speak.
