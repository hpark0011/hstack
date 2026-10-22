---
name: hstack
description: >
  Entry point for the software lifecycle. Use when the user invokes /hstack
  (plugin form: /hstack:hstack) or asks to take the current work as far as it
  can go without naming a stage. Detects no spec, a spec without tickets,
  tickets without code, or code without a pull request, then runs /plan,
  /implement, or /ship. Differs from /plan and /ship, which start at a known
  stage, and from /hstack-help, which only names a skill.
disable-model-invocation: true
---

# HStack

Run one next stage. Do not narrate the stages. Speak only when you stop before handing off. The skill you hand off to speaks once at its end.

`/hstack` and `/hstack:hstack` are the same invocation. The prefix appears when this package is installed as a Claude Code plugin.

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

## Where the work is

Name the requirement from the user's message. Then look, using only the config:

- a spec under `paths.specs` that matches the requirement
- a ticket id in the request or the branch, or a file under `tickets.files_dir`
- whether the current branch is `default_branch`, and whether the diff for this requirement is empty
- an open pull request for this branch, when the host can check

The user naming a stage wins. Read that skill and follow it. Do not copy its steps here.

Otherwise:

| You find | Follow |
|---|---|
| No spec, or a spec and no ticket | [plan](../plan/SKILL.md) |
| A ticket, and this checkout is `default_branch` or the diff is empty | [implement](../implement/SKILL.md) |
| A feature branch with a diff and no pull request | [ship](../ship/SKILL.md) |
| An open pull request | Stop. Give the link. Do not run ship again. |

There is no workflow between tickets and a branch with code. That gap is [implement](../implement/SKILL.md). [plan](../plan/SKILL.md) stops at tickets. [ship](../ship/SKILL.md) starts from code.

## Stop before handing off

Stop without calling a skill when the requirement matches two specs or two tickets, or the checkout is `default_branch` and the next stage would be ship. Say what you found and the decision you need.

For which skill to use, the user can run [hstack-help](../hstack-help/SKILL.md). Do not route there yourself when they asked you to do the work.
