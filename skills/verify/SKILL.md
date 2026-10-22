---
name: verify
description: >
  Run the project's configured checks and record a pass or fail verdict. Use
  when the user asks to verify, or /ship or /resolve reaches verification.
  Does not review, simplify, or publish. Differs from /ship, which runs verify
  as one gate among the publish steps, and from /review, which does not run
  the checks.
---

# Verify

Read `.hstack/config.yaml` in the repo you are working in. If that file is missing, stop and tell the user to run `/setup-hstack`. Use paths and commands from that file only.

If `verify.commands` is empty, stop. Verdict is `unconfigured`. Do not invent a check. Do not claim the change works.

From the repo root, run each command in order, exactly as written. Do not add flags. A failing command does not skip the ones after it, unless a command cannot start.

Record:

```
verdict: pass | fail | unconfigured
commands:
  - command: <the configured command>
    exit: <code>
    note: <one line, only when the exit is not 0>
```

`pass` means every command exited 0. Do not report `pass` from a partial run.

Do not edit the product to make a check pass unless the caller is `/resolve` or `/scope` and that skill told you to repair. This skill does not publish.

If the user invoked you directly, one short message: the verdict and any failing command. If `/ship`, `/resolve`, or `/scope` called you, return the record and do not speak.
