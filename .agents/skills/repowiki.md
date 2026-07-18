---
description: Run and interpret `./scripts/repowiki` commands in aomi-widget — pass the user's arguments through to the CLI, correct only obvious typos, handle the first-run build, and relay the result in plain language. Use whenever the user writes `/repowiki ...`, asks to run a repowiki subcommand (list/look/search/refresh/update/index/rename/add/doctor), or wants repowiki output explained.
allowed-tools: Bash, Read, Grep, Glob
---

# Repowiki

`./scripts/repowiki` is the deterministic CLI for aomi-widget's maintained repo
wiki (the docs under `docs/`). Your job is to run the user's intended command
from the repo root, correct only obvious mistakes, and relay a clear, operational
result — not to explain what repowiki is.

Treat `$ARGUMENTS` as arguments to `./scripts/repowiki`. So `/repowiki look auth`
means run `./scripts/repowiki look auth`.

In aomi-widget the wrapper does **not** vendor the binary — it shells out to the
neighboring `product-mono` checkout (`../product-mono/aomi`) and runs
`cargo run -p repowiki -- --root <aomi-widget>`. So it needs that sibling repo
present. If you've installed `repowiki` globally (see "Install globally" below),
prefer the global binary — it has no sibling/build dependency.

## First run builds a Rust binary — don't mistake it for a hang or failure

`./scripts/repowiki` compiles the CLI via cargo (in the neighboring product-mono
workspace) on the first run after a fresh checkout or rebuild. Expect on a cold
run:

- It can take **a few minutes**, and may print `Blocking waiting for file lock on
  artifact directory` if another build holds the lock — wait.
- It emits cargo build noise to stderr, including warnings like
  `skill '<name>' is disabled in its manifest … skipping`. **These are not
  errors** — they come from an unrelated workspace crate's build script. Judge
  success from the CLI output after the `Running target/debug/repowiki …` line
  and the exit code, not from the build chatter.

Subsequent runs use the cached binary and are fast.

## Commands

Read-only (safe to run freely): `list` (topics by slug/title), `look <topic>`
(print a topic; falls back to search if no exact match), `search "<query>"`
(keyword + optional semantic), `doctor` (validate health; **exits non-zero by
design when it finds actionable issues** — a successful run reporting problems,
not a tool failure).

Mutating (let them mutate; don't broaden scope): `add <topic>`, `rename <old>
<new>`, `update <topic>`, `index` (rebuild), `refresh` (incremental), `doctor
--fix`. `--root <DIR>` overrides the repo root (defaults to `.`).

When `look <topic>` reports "topic not found" but offers a single clear
candidate, re-run `look` on it and say you resolved it; if several are offered,
list them and ask — don't guess.

## Embeddings affect `search`, `refresh`, and `index`

Semantic mode uses the embedding provider configured in `repowiki.toml` and needs
that provider's credentials (e.g. `OPENAI_API_KEY`). The keyword-only flag is
asymmetric by subcommand — don't guess:

- `search` → `--no-embeddings`
- `refresh` / `index` → `--skip-embeddings`

If a run fails with a provider error (missing key, quota/`429`), that's an
environment problem, not a repowiki bug: fall back to the correct keyword-only
flag for that subcommand and say semantic mode is unavailable until it's fixed.

## Workflow

1. **Resolve the repo root** — the dir with both `scripts/repowiki` and
   `repowiki.toml` (the aomi-widget root). If you can't find it, say so and stop.
2. **Parse the request as a CLI pass-through** — preserve the subcommand, flags,
   and argument order.
3. **Correct only obvious mistakes** — one clearly-misspelled subcommand with a
   single match (`refres` → `refresh`) or one malformed flag. Confirm with
   `--help` when unsure. Don't swap subcommands, add flags, or broaden a mutating
   command. If ambiguous, ask one short question.
4. **Run the effective command** from the repo root. Let mutating commands mutate.
5. **Relay the result** — the effective command if corrected; whether it
   succeeded (from real output + exit code, ignoring build noise); the important
   lines, not raw spam; the actionable reason if it failed.
6. **Review related docs after topic changes** — when a command changes
   `docs/**/*.md`, look at the diff and any related/generated docs the output
   names. Use the diff as the source of truth; make only minimal follow-up edits.

## Source of truth

When behavior is unclear, prefer live output over assumptions, in this order:
`./scripts/repowiki --help` → `./scripts/repowiki <subcommand> --help` →
`repowiki.toml`.

## Response style

Keep it operational. Good: "Ran `./scripts/repowiki update ts-client`. It updated
`docs/.../ts-client.md`." / "Read `refres` as `refresh`." / "`doctor` failed: one
source path is missing." Avoid: long explanations of what repowiki is,
speculative edits to the command, or dumping raw cargo/stderr noise.

## Examples

- `/repowiki list` → run it, summarize the topics.
- `/repowiki serch "telegram auth"` → recognize the typo, run
  `./scripts/repowiki search "telegram auth"` (add `--no-embeddings` if semantic
  fails), mention the correction.
- `/repowiki doctor --fix` → run it, report what it validated and fixed, review
  any changed topic docs.
- "what does `/repowiki doctor` mean?" → if they want the live result, run
  `doctor`; otherwise explain the output they pasted without re-running.

## Install globally (run repowiki in any repo)

`./scripts/repowiki` here depends on the sibling product-mono checkout and builds
on demand. To use repowiki in *any* repo — and drop the sibling dependency —
install the binary onto PATH. Share these with colleagues; run from a
**product-mono** checkout (which owns the crate):

```sh
cargo install --path aomi/bin/repowiki                          # repowiki → ~/.cargo/bin
install -m 0755 scripts/repowiki-init ~/.cargo/bin/repowiki-init
```

Gotchas to pass along:

- `~/.cargo/bin` must be on PATH (default with rustup).
- The binary dynamically links Homebrew `postgresql@14`'s `libpq`. If a Postgres
  upgrade moves that path and `repowiki` fails to load, re-run
  `cargo install --path aomi/bin/repowiki` to rebuild — that's also how you update.

## Bootstrap a wiki in a new repo

`repowiki` requires a `repowiki.toml` at the repo root and has no built-in
`init`. `repowiki-init` (installed above) fills that gap. From any repo:

```sh
repowiki-init                      # scaffold repowiki.toml + docs/ skeleton (won't clobber)
repowiki add <topic>               # scaffold docs/topics/<topic>/facts/<topic>.md
repowiki index --skip-embeddings   # build the keyword index (no API key needed)
repowiki list                      # list topics
repowiki doctor                    # health check
```
