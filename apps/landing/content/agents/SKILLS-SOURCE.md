---
title: Agent skills — source mirror
description: Skill files copied from github.com/aomi-labs/skills for inclusion in /llms-full.txt.
---

# Source mirror

The contents of `skills/` are copied from the canonical
[aomi-labs/skills](https://github.com/aomi-labs/skills) repository so they can
be served from `aomi.dev/llms-full.txt` without a runtime dependency on a
sibling checkout.

To resync after the skills repo changes, run from the repo root:

```bash
cp /path/to/skills/aomi-transact/SKILL.md            apps/landing/content/agents/skills/aomi-transact/SKILL.md
cp /path/to/skills/aomi-transact/references/*.md     apps/landing/content/agents/skills/aomi-transact/references/
cp /path/to/skills/aomi-build/SKILL.md               apps/landing/content/agents/skills/aomi-build/SKILL.md
cp /path/to/skills/aomi-build/references/*.md        apps/landing/content/agents/skills/aomi-build/references/
```

Do not edit the `skills/` files in this repo directly — edit them in the
canonical repo and re-copy.
