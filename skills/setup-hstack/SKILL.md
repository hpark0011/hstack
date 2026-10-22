---
name: setup-hstack
description: >
  Detect or ask where this repo keeps specs, tickets, docs, checks, and pull
  request instructions, then write .hstack/config.yaml. Use once per repo, or
  when a skill says the config is missing. Differs from /hstack, which runs
  the lifecycle and does not write config, and from /hstack-help, which only
  names a skill.
---

# Setup HStack

`/setup-hstack` and `/hstack:setup-hstack` are the same invocation.

Write `.hstack/config.yaml` in the repo you are working in. The file is meant to be committed. Commit it only when the user asks.

Run `node` on `scripts/detect.mjs` in this skill's directory, with the target repo as the working directory. Stdout is the proposed YAML. Stderr lists questions.

- A value already filled in stdout was found on disk or from git. Keep it.
- A question whose proposed value is null needs an answer. Ask with the options the detector printed. Prefer a multiple-choice question.
- A question with a proposed value needs a yes before you keep it, unless the user already told you to accept defaults. Accepting defaults is the detector's `--yes` flag. Do not pass `--yes` on your own.
- `--write` persists the proposal it just printed, and only when no questions remain. When an answer changes a value, write the YAML yourself. If the file already exists, the detector refuses `--write` unless you pass `--force`. Show the user the diff and get a yes before `--force`.

Do not invent a path the detector did not find and the user did not choose. A specs directory the user agrees to may be a path that does not exist yet. Do not create that directory here. `/spec` creates it when it writes a file.

## When you change the ticket system

The detector fills the adapter fields. If the user picks a different `tickets.system` than the one in stdout, set the related keys as follows and leave the others null.

| system | id_patterns | files_dir | comment |
|---|---|---|---|
| `github` | `#(\d+)`, `\bGH-(\d+)\b`, `\bissue-(\d+)\b` | null | command `gh issue comment {id} --body-file -` |
| `linear` | `\b[A-Z][A-Z0-9]+-\d+\b` | null | tool `linear` |
| `files` | `[]` | the directory the user names | command null, and `files_are_threads: false` unless they say the files are a thread |
| `command` | whatever they use to recognize an id | null | the create and comment commands they give |

`tickets.create.command` stays null unless the user supplies a command. Null means the step skill uses its built-in adapter for `github`, `linear`, and `files`.

`files_are_threads` defaults to false. Ticket files are not an activity thread. Do not set it true unless the user says comments belong in those files.

## Done

One short message: the config path, any key the user still needs to choose, and that `/hstack` is next. Do not start the lifecycle in this skill.
