# Notice

`skills/simplify/SKILL.md` is derived from Brian Lovin's simplify skill in [brianlovin/agent-config](https://github.com/brianlovin/agent-config/blob/main/skills/simplify/SKILL.md). That skill is written for one stack. This copy keeps the behavior-preserving simplification rules and takes project style from the repo it runs in.

`skills/ship/SKILL.md` is a repo-agnostic port of the `/ship` skill used on Doma. Script paths, ticket commands, and prompt files come from `.hstack/config.yaml`, which `/setup-hstack` writes. They are not hardcoded.
