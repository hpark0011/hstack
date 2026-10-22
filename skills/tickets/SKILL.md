---
name: tickets
description: >
  Split a spec into tracker tickets. Use when a spec exists and the user asks
  for tickets, or /plan reaches this step. Creates tickets through the system
  named in .hstack/config.yaml and does not write code. Differs from /spec,
  which writes the spec, and from /implement, which builds tickets that
  already exist.
---

# Tickets

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Read the spec the user named, or the spec `/plan` just wrote. If you cannot tell which spec, stop.

Create the smallest set of tickets that can ship independently. One slice is one ticket. A spec that is one slice gets one ticket. Each ticket has a title, the spec path, and an acceptance check.

Do not write code. Do not open a pull request. Do not comment on a ticket you just created beyond the body itself.

## How to create

Use the first case that matches `tickets.system`.

- `github`, and `tickets.create.command` is null: `gh issue create`, title and body as flags. The id is the issue number.
- `linear`, and `tickets.create.command` is null: the host's Linear tool. The id is the issue identifier. If the host has no Linear tool, stop.
- `files`: write one markdown file per ticket under `tickets.files_dir`. If `files_dir` is null, stop. The id is the filename stem.
- `command`, or `tickets.create.command` is set: run that command from the repo root. Stdin is the title line, a blank line, then the body. The command prints the new id. If the command is null, stop.

The id is what later steps match with `tickets.id_patterns`. For `files`, patterns may be empty; the stem is the id.

If the user invoked you directly, one short message: the spec path and the new ids. If `/plan` or `/hstack` called you, return the ids to the caller and do not speak.
