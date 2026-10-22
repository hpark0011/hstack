---
name: spec
description: >
  Write a specification for one requirement. Use when the user asks for a spec,
  or /plan reaches the spec step. Writes a markdown file under paths.specs from
  .hstack/config.yaml and does not create tickets or code. Differs from
  /tickets, which splits an existing spec, and from /plan, which chains both
  and then stops.
---

# Spec

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

If `paths.specs` is null, stop. Do not invent a directory.

If a file under `paths.specs` already matches this requirement, edit that file. If several match, stop and ask which one. Otherwise add one markdown file. Name it from the requirement, in kebab-case.

Write these sections and nothing else:

- Problem
- Outcome
- Non-goals
- Constraints
- Open questions

An open question is a product decision the spec cannot settle. Do not hide one by guessing. Do not create tickets. Do not write code. Do not open a pull request.

If the user invoked you directly, one short message: the spec path and any open question. If `/plan` or `/hstack` called you, return the path to the caller and do not speak.
