---
name: pr
description: >
  Open a pull request for the current branch using the repo's configured
  script, prompt, or template. Use when the user asks to open a pull request,
  or /ship reaches publication. Does not rebase, review, or force-push.
  Differs from /ship, which prepares the branch before this step, and from
  /ticket-comment, which comments after the request exists.
---

# Pull request

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Do not make product edits. Do not rebase. Do not force-push. Do not push `default_branch`. If this checkout is `default_branch`, stop.

Publish with the first case that applies:

1. `pr.script` is set. Run that command through the shell from the repo root. Do not also run `gh pr create`.
2. `pr.prompt` is set. Follow that file. Do not also run `gh pr create`.
3. Otherwise draft the request yourself. If `pr.template` is set, fill that template. If it is null, match recent merged pull requests on this repo: a short title and one or two plain paragraphs covering what changed, why, and which checks actually ran. Do not invent a section template. Say which checks did not run. Create it with `gh pr create` when `gh` is available. If it is not, stop and leave the title and body for the user.

Push only in case 3, and only when the branch has no upstream: `git push -u origin HEAD`. Never use `--force`. If the remote rejects a non-force push, stop. The branch needs the rebase step in `/ship`, which is the only step allowed to use `--force-with-lease`.

If the user invoked you directly, one short message: the pull request link, or why it was not opened. If `/ship` called you, return the link and do not speak.
