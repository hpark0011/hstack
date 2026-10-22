---
name: plan
description: >
  Turn an idea into a spec and tickets. Use when the user invokes /plan
  (plugin form: /hstack:plan) or /hstack finds no spec or no tickets. Runs
  /spec, then /tickets, and stops before any code. Differs from /ship, which
  publishes code that already exists, and from /spec or /tickets alone, which
  do one of those steps.
disable-model-invocation: true
---

# Plan

Run the steps below once. Do not narrate them. Speak only for an early stop, or once at the end.

`/plan` and `/hstack:plan` are the same invocation.

Read `.hstack/config.yaml`. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Do not implement. Do not open a pull request.

## 1. Spec

If `paths.specs` already has a spec for this requirement, keep it. Otherwise read and follow [spec](../spec/SKILL.md).

If `paths.specs` is null, stop. Do not invent a directory.

## 2. Tickets

If that spec already has tickets, keep them. Otherwise read and follow [tickets](../tickets/SKILL.md).

## Stop early

Stop and ask, then do not continue, when the requirement is too thin to name an outcome, or two existing specs could be the one you should extend. Say what finished, what did not run, and the decision you need.

## Final message

One short message: the spec path, the ticket ids, and that implementation has not started. No stage log.
