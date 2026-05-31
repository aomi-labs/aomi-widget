---
name: repowiki
description: >
  Run and interpret `./scripts/repowiki` commands for an Aomi repository that
  contains `repowiki.toml`. Use when the user writes `/repowiki ...`, asks to
  pass arguments through to the repowiki CLI, wants a repowiki subcommand run
  with minor typo correction, or wants repowiki output explained in plain
  language.
compatibility: "Requires a repository checkout with `./scripts/repowiki` and `repowiki.toml` at the repo root."
license: MIT
allowed-tools: Bash
metadata:
  author: aomi-labs
  version: "0.1"
---

# Repowiki

Run `repowiki` as the local CLI helper for maintained repository knowledge.
Preserve the user's command intent, correct only obvious argument mistakes,
execute `./scripts/repowiki ...` from the repo root, and relay the result back
clearly.

Repowiki's deterministic CLI owns machine-checkable facts and index state. In
this repo, maintained docs live under `docs/`, especially `docs/topics/` and
`docs/generated/`.

## Workflow

1. Resolve the repo root.
   - Use the current workspace root when it contains both `scripts/repowiki`
     and `repowiki.toml`.
   - If the current directory is inside such a repo, run the command from that
     repo root.
   - If the repo root cannot be found, say so briefly and stop.

2. Parse the request as a CLI pass-through.
   - Treat `/repowiki update auth` as `./scripts/repowiki update auth`.
   - Treat `repowiki search "tool flow"` or "run repowiki doctor" the same
     way.
   - Preserve the subcommand, flags, and argument order unless an obvious typo
     must be corrected.

3. Correct only obvious mistakes.
   - Use `./scripts/repowiki --help` or
     `./scripts/repowiki <subcommand> --help` to confirm syntax when needed.
   - Fix small mistakes such as a misspelled subcommand with one clear match or
     a malformed flag spelling with one clear intended flag.
   - Do not swap subcommands, add extra flags, or broaden the scope of a
     mutating command.
   - If the correction is ambiguous, ask one short clarifying question instead
     of guessing.

4. Execute the command from the repo root.
   - Let mutating commands mutate: `add`, `rename`, `update`, `index`,
     `refresh`, and `doctor --fix`.

5. Relay the result back.
   - Report the effective command if it was corrected.
   - Summarize the important stdout and stderr lines.
   - State whether the command succeeded.
   - If it failed, report the actionable reason rather than dumping raw noise.
   - If it changed files, mention the affected files when they are visible from
     the output or obvious from the command.

6. Review related docs after topic changes.
   - When a command changes `docs/topics/**/*.md`, inspect the diff and any
     related topic or generated docs that the command output names.
   - Use the topic diff as the source of truth. Make only minimal follow-up
     edits when related docs are now wrong or incomplete.
   - Do not invent machine-generated regeneration beyond the repowiki CLI.

## Source Of Truth

Use these in this order when command behavior is unclear:

- `./scripts/repowiki --help`
- `./scripts/repowiki <subcommand> --help`
- `repowiki.toml`

Prefer live `--help` output over assumptions.

## Response Style

Keep the reply operational.

Good:

- "Ran `./scripts/repowiki update auth-adapter`. It updated
  `docs/topics/auth-adapter.md`."
- "Interpreted `/repowiki refres --skip-embeddings` as
  `./scripts/repowiki refresh --skip-embeddings`."
- "`doctor` failed because one source path is missing and generated docs are
  stale."

Avoid:

- long explanations of what repowiki is
- speculative edits to the command intent
- raw command spam when a short summary is enough

## Examples

User:
`/repowiki update auth-adapter`

Agent behavior:
Run `./scripts/repowiki update auth-adapter` from the repo root and summarize
what changed.

User:
`/repowiki refres --skip-embeddings`

Agent behavior:
Recognize the obvious typo, run
`./scripts/repowiki refresh --skip-embeddings`, and mention the correction.

User:
`what does /repowiki doctor mean?`

Agent behavior:
Run `./scripts/repowiki doctor` only if the user is asking for the live current
result; otherwise explain the meaning of the reported output they already
pasted.
