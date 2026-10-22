---
name: simplify
description: >
  Simplify recently modified code without changing behavior. Use when the user
  invokes /simplify (plugin form: /hstack:simplify) or /ship reaches this step.
  Edits only the current diff, for clarity. Differs from /scope, which decides
  whether the change should be split, and from /resolve, which repairs review
  findings. Derived from brianlovin/agent-config's simplify skill.
---

# Simplify

Derived from Brian Lovin's simplify skill ([brianlovin/agent-config](https://github.com/brianlovin/agent-config/blob/main/skills/simplify/SKILL.md)). This copy does not assume that repo's stack. Project style comes from the repo you are in.

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Edit only code this change touched: the diff since the merge-base with `default_branch`, plus staged and unstaged edits. If the user names a wider scope, use that instead. If the diff is already plain, do not edit.

Do not change behavior. Do not add a feature, a log line, or a new abstraction. Do not commit, push, or open a pull request.

Style, in order: files listed in `rules`, then `AGENTS.md`, then `CLAUDE.md`, then the code next to the edit. Those win when they conflict with the preferences below. They do not win over "do not change behavior."

Prefer:

- names that say what the value is
- less nesting, when the nesting does not earn its depth
- `if` / `else` or `switch` instead of a nested ternary
- deleting a comment that restates the next line

Do not:

- drop a helper whose name a caller needs
- pack a function into a one-liner to save lines
- add a comment that explains the simplification

If the user invoked you directly, one short message: what you simplified, or that the diff was already plain. If `/ship` called you, return that note and do not speak.
