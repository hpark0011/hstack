---
name: resolve
description: >
  Fix supported findings from a review record. Use when the user asks to
  resolve review findings, or /ship has a review record. Repairs those
  findings and does not commit, push, or open a pull request. Differs from
  /review, which is read-only, and from /implement, which builds new behavior
  rather than repairing findings.
---

# Resolve

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

Use the review record already in the conversation. If there is none, read and follow [review](../review/SKILL.md) once, then continue. Do not ask the user to paste it.

Fix every finding marked supported. Leave unsupported hunches unfixed and list them in the record you return. Follow files listed in `rules`, then `AGENTS.md` and `CLAUDE.md` at the repo root when they exist.

When you can spawn subagents, spawn one pair per supported finding and run the pairs in parallel. One agent implements the repair. The other follows [verify](../verify/SKILL.md) and does not edit. The implementer keeps repairing that finding until the verifier reports pass, or the finding is a product decision. When you cannot spawn subagents, repair the findings one at a time, then follow verify once after the batch. If that verdict is fail and the repair is still inside this change, fix and follow verify again.

Do not commit, push, merge, or delete a worktree. Do not start a second review. If a supported finding remains open because the repair is a product decision, stop and say which id.

If the user invoked you directly, one short message: which ids are fixed, which remain, and the verification verdict. If `/ship` called you, return that record and do not speak.
