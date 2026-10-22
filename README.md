# HStack

HStack is Hyunsol Park's software lifecycle, in [Agent Skills](https://agentskills.io) format. One entry skill looks at where the work is and runs the workflow for that stage. The workflows call step skills. The step skills read `.hstack/config.yaml` from the repo they are working in, so the same package runs in any project.

`/ship` is a repo-agnostic port of an earlier Doma skill. Paths, ticket commands, and pull-request instructions come from the config. `/simplify` is derived from Brian Lovin's simplify skill; see [NOTICE.md](NOTICE.md).

## Skill map

| Skill | You invoke it when |
|---|---|
| `/hstack` | You want the work taken as far as it can go, and you have not named the stage. |
| `/plan` | The work is an idea, or a spec that has no tickets. Stops before code. |
| `/ship` | The code is already on a feature branch. Review, repair, scope, simplify, verify, rebase, pull request, ticket comment. |
| `/spec` | You want the spec only. |
| `/tickets` | A spec exists and you want tracker tickets only. |
| `/implement` | A ticket exists and the code does not. Stops before review and the pull request. |
| `/review` | Read-only review: assumptions, couplings, scattered responsibilities, mixed responsibilities. |
| `/resolve` | Fix supported findings from a review. Does not publish. |
| `/scope` | Decide whether the diff is one change or a coupling problem. A file count alone is not a failure. |
| `/simplify` | Make the touched code plainer without changing behavior. |
| `/verify` | Run the commands in the config and record a verdict. |
| `/pr` | Open the pull request and nothing else. |
| `/ticket-comment` | Comment on the linked ticket. Does not create one in order to comment. |
| `/setup-hstack` | Once per repo. Writes `.hstack/config.yaml`. |
| `/hstack-help` | You want the skill name and one line on why. It does not do the work. |

`/hstack` calls `/plan`, `/implement`, or `/ship`. It does not redo their steps. `/plan` calls `/spec` and `/tickets`. `/ship` calls the publish steps in order. There is no third workflow between tickets and code; that step is `/implement`.

Workflows do not narrate stages. They speak once at the end, or when they stop early for a decision. `/ship` does not start itself when implementation finishes.

In a Claude Code plugin install, commands are prefixed: `/hstack:ship`, `/hstack:plan`, `/hstack:hstack`. A `skills` CLI install into `.claude/skills` uses the bare names.

## Install

The `skills` CLI ([vercel-labs/skills](https://github.com/vercel-labs/skills)) discovers `skills/*/SKILL.md` at the root of this repo. The public package is [hpark0011/hstack](https://github.com/hpark0011/hstack).

From the consumer repo:

```bash
# Project install. Commit the result if the team should share it.
npx skills add hpark0011/hstack --skill '*' -a claude-code -a codex -a cursor -y

# Global install, available in every repo.
npx skills add hpark0011/hstack --skill '*' -g -a claude-code -a codex -a cursor -y
```

From a local checkout of this package, while developing it:

```bash
npx skills add /path/to/hstack --skill '*' -a claude-code -a codex -a cursor -y
```

Project paths the CLI writes:

| Agent | Project | Global |
|---|---|---|
| Claude Code | `.claude/skills/<skill>/` | `~/.claude/skills/<skill>/` |
| Codex | `.agents/skills/<skill>/` | `~/.agents/skills/<skill>/` |
| Cursor | `.agents/skills/<skill>/` | `~/.cursor/skills/<skill>/` |

Cursor and Codex share the project directory `.agents/skills`. One project install covers both. When the same install also targets Claude Code, the CLI writes the files under `.agents/skills/<skill>/` and points `.claude/skills/<skill>` at that directory. Claude Code still loads `.claude/skills/`.

### Claude Code plugin

This repo is a one-plugin marketplace. The plugin root and the marketplace root are the same directory.

```text
/plugin marketplace add hpark0011/hstack
/plugin install hstack@hstack
```

From a local checkout while developing: `claude plugin marketplace add /path/to/hstack`, then `/plugin install hstack@hstack`.

### Cursor plugin

`.cursor-plugin/plugin.json` marks the repo root as a Cursor plugin, the same manifest shape pstack uses. This repo is not listed in the public Cursor marketplace, so `/add-plugin hstack` will not find it. Use the `skills` CLI (`-a cursor`) or load the checkout as a local plugin.

### Codex plugin

`.codex-plugin/plugin.json` is the plugin manifest. `.agents/plugins/marketplace.json` is the marketplace entry, with the plugin path `./`.

```bash
codex plugin marketplace add hpark0011/hstack
```

The plugin has no external account. The marketplace policy field is the catalog shape Codex expects.

## Pin to a commit

`skills add` accepts a full 40-character commit SHA as a URL fragment:

```bash
npx skills add https://github.com/hpark0011/hstack#<40-character-sha> --skill '*' -y
```

A branch or tag uses the same fragment (`#main`, `#v0.1.0`). The project lockfile `skills-lock.json` records the source. Plugin installs follow that host's own ref pin (`--ref` on `codex plugin marketplace add`, or a marketplace source `sha` in Claude Code).

## Setup and config

In the consumer repo, run `/setup-hstack` once. It runs `skills/setup-hstack/scripts/detect.mjs`, asks about anything it could not see, and writes `.hstack/config.yaml`. Commit that file. Step skills stop and tell you to run setup when it is missing.

The annotated key list is [schema/config.example.yaml](schema/config.example.yaml).

| Key | Meaning |
|---|---|
| `default_branch` | Branch that implement and ship refuse to edit. Ship rebases onto it. |
| `paths.specs`, `paths.docs`, `paths.adrs` | Directories. `null` if the repo has none. |
| `verify.commands` | Commands run, in order, from the repo root. Empty means verify stops. |
| `tickets.system` | `github`, `linear`, `files`, or `command`. |
| `tickets.id_patterns` | Regexes. The id is capture group 1, or the whole match. |
| `tickets.files_dir` | Markdown tickets when `system` is `files`. |
| `tickets.files_are_threads` | False unless comments belong in those files. Default false. |
| `tickets.create.command` | Null uses the built-in adapter. Otherwise: title, blank line, body on stdin; the command prints the new id. |
| `tickets.comment.command` | `{id}` is replaced. The body is stdin. |
| `tickets.comment.tool` | `linear`, or null. |
| `tickets.comment.instructions` | Prose, used only when command and tool are null. |
| `pr.script` | Shell command that opens the pull request. When set, `/pr` does not also run `gh pr create`. |
| `pr.prompt` | Instructions file. Same rule: it owns publication. |
| `pr.template` | Body template. Null means match recent merged pull requests. |
| `rebase.conflict_prompt` | File to follow while resolving rebase conflicts. |
| `rules` | Extra instruction files. Review, resolve, implement, and simplify read them. |
| `ship.forbidden_env` | Variable names `/ship` must not set. |

Built-in adapters when the matching command is null:

- `github` creates with `gh issue create` and comments with `gh issue comment {id} --body-file -`.
- `linear` uses the host's Linear tool.
- `files` writes one markdown file per ticket. Comments are not appended unless `files_are_threads` is true.

## Safety

`/ship` commits with `git commit -- <paths>` for paths it inspected. It does not stash, hard-reset, or push `default_branch`. After a rebase it pushes only the feature branch: `git push -u origin HEAD` the first time, and `git push --force-with-lease` when the remote branch already exists. It stops when the lease is rejected, when a conflict is a product choice, or when the scope check says the change should be split. `/pr` never force-pushes. If a plain push is rejected, it stops and leaves the rebase to `/ship`.

## Check the package

```bash
npm run validate
node skills/setup-hstack/scripts/detect.mjs --self-test
```

The validator checks frontmatter, folder names, that plan and ship only call skills that exist, and that skill files do not carry another repo's paths. The detector self-test checks a fixture repo and an empty one.

## Layout

```text
skills/<name>/SKILL.md          Agent Skills. The skills CLI discovers these.
skills/setup-hstack/scripts/    Detector. Installed with the setup skill.
schema/config.example.yaml      Config keys.
.claude-plugin/                 Claude Code plugin and marketplace.
.cursor-plugin/plugin.json      Cursor plugin.
.codex-plugin/plugin.json       Codex plugin.
.agents/plugins/marketplace.json
scripts/validate-skills.mjs
```

Not in this version: principle skills, and a hook that starts `/ship` when implementation ends. `/ship` runs when you invoke it, or when `/hstack` selects it.
