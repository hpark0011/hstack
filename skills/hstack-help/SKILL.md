---
name: hstack-help
description: >
  Say which HStack skill to use, with one line on why. Use when the user
  invokes /hstack-help (plugin form: /hstack:hstack-help) or asks which skill
  fits a situation. Does not run that skill. Differs from /hstack, which
  detects the stage and does the work, and from /setup-hstack, which writes
  .hstack/config.yaml.
---

# HStack help

Answer with the skill to use and one line on why. Do not start the work. Read the skill you name before you quote it.

`/hstack-help` and `/hstack:hstack-help` are the same invocation.

A message that asks you to do the work, and does not ask which skill, is not a help question. Read [hstack](../hstack/SKILL.md) and follow it.

If `.hstack/config.yaml` is missing and the skill you would name needs it, say that `/setup-hstack` has to run first.

| The user wants to | Skill | Why |
|---|---|---|
| Take the work as far as it can go, stage unknown | [hstack](../hstack/SKILL.md) | It detects the stage and calls one workflow. |
| Go from an idea to a spec and tickets | [plan](../plan/SKILL.md) | It chains spec and tickets and stops before code. |
| Write the spec only | [spec](../spec/SKILL.md) | It does not create tickets. |
| Turn a spec into tickets | [tickets](../tickets/SKILL.md) | It does not write code. |
| Build a ticket that already exists | [implement](../implement/SKILL.md) | It stops before review and the pull request. |
| Publish a branch that already has the code | [ship](../ship/SKILL.md) | It runs the publish chain and speaks once at the end. |
| Review without editing | [review](../review/SKILL.md) | It records assumptions, couplings, and mixed responsibilities. |
| Fix a review's findings | [resolve](../resolve/SKILL.md) | It repairs a record and does not publish. |
| Ask whether the diff should be one change | [scope](../scope/SKILL.md) | A large file count is not itself a failure. |
| Clean the diff without changing behavior | [simplify](../simplify/SKILL.md) | It does not decide scope and does not fix review findings. |
| Run the project's checks | [verify](../verify/SKILL.md) | It runs only the commands in the config. |
| Open a pull request and nothing else | [pr](../pr/SKILL.md) | It does not rebase or review. |
| Comment on the linked ticket | [ticket-comment](../ticket-comment/SKILL.md) | It does not create a ticket in order to comment. |
| Point the skills at this repo | [setup-hstack](../setup-hstack/SKILL.md) | It writes `.hstack/config.yaml`. |
| Choose a skill | `/hstack-help` | It routes and stops. |

Close calls:

- `/hstack` when you do not know the stage. `/plan` when you know there is no spec or no tickets. `/ship` when the code is already on a feature branch.
- `/review` lists findings. `/resolve` fixes the supported ones. `/scope` decides whether the diff is one ship. `/simplify` only makes the touched code plainer.
- `/pr` opens the request. `/ship` does the gates, the rebase, the request, and the ticket comment.
- `/tickets` creates tickets. `/ticket-comment` posts on one that already exists.
