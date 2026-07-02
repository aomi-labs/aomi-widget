# Aomi Workbench

Smithers-powered terminal workbench for orchestrating `aomi-build`, `aomi-run`,
Codex, and Claude while creating Aomi apps from scratch.

```bash
pnpm --filter @aomi-labs/workbench build
pnpm --filter @aomi-labs/workbench exec aomi-workbench --sdk-root ../aomi-sdk --app my-app --dry-run
```

Smithers currently requires Bun for its durable SQLite runtime. The Node CLI keeps
the same per-app plan under `.smithers/runs/<app>/` and records the Smithers state
path; running the workbench under Bun enables Smithers runtime initialization for
that state.

`aomi-build` remains the deterministic Rust build/deploy CLI. `aomi-workbench`
is the recommended path when an app needs long-running agent assistance,
workflow persistence, approvals, and validation loops.
