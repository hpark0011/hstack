---
name: ticket-comment
description: >
  Post one comment on the linked ticket describing the work, the pull request,
  and the verification verdict. Use when the user asks to comment on the
  ticket, or /ship finishes publication. Does not create a ticket and does not
  open a pull request. Differs from /tickets, which creates tickets, and from
  /pr, which opens the request.
---

# Ticket comment

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Find one ticket id. Search the user message, the current branch name, and the commit subjects since the merge-base with `default_branch`. Apply each regex in `tickets.id_patterns`. The id is capture group 1 when the pattern has one, otherwise the whole match.

When `tickets.system` is `files`, the id is the stem of a file in `tickets.files_dir` whose name matches the branch or the requirement. Patterns may be empty in that case.

If several ids match, stop and ask. If none match, say so. Do not create a ticket only to comment on it.

The comment says what you did, the pull request link if one exists, the verification verdict if one exists, and anything the reader should try. One comment.

Post it with the first case that applies:

- `tickets.comment.command` is set. Replace `{id}` with the id. The body is stdin. Run it from the repo root.
- `tickets.comment.tool` is `linear`. Use the host's Linear tool. If the host has none, stop.
- `tickets.comment.instructions` is set, and command and tool are null. Follow those instructions.
- More than one of command, tool, and instructions is set. Stop and ask which one.
- `tickets.system` is `files` and `tickets.files_are_threads` is false. Do not append the comment to the ticket file. Say that this repo has no comment thread.
- Otherwise stop and say the repo has no comment path.

If the user invoked you directly, one short message: the id and whether the comment was posted. If `/ship` called you, return that and do not speak.
