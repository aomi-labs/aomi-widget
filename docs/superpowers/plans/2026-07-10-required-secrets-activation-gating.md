# Required-Secret Activation Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect the secrets an Aomi app declares and force the builder to fill every required one before the app can be activated.

**Architecture:** A plugin's declared secrets live in its `DynManifest`, readable only by `dlopen`ing the built cdylib. `aomi-sdk` exposes that as `aomi-build manifest --lib <path>`. The platform repo's CI (`community-apps/.github/scripts/build_candidate.py`), which builds each app's cdylib and publishes the release, calls that command and records the slots into the release's `manifest.json`. Aomi Build's BFF then fetches that release asset from GitHub (using the token it already holds), diffs the required slots against the vault's configured key names, disables the Activate button until the set is empty, and re-checks server-side with a 409.

**Tech Stack:** Rust (`aomi-sdk`: clap, serde, libloading), Python (`community-apps` CI), TypeScript (`packages/deploy`, Next.js App Router BFF, React), vitest, cargo test, unittest.

## Global Constraints

- Three repos: `/Users/han/github/aomi-sdk`, `aomi-labs/community-apps` (clone fresh; **PR only, never merge**), and `/Users/han/github/aomi-widget`. No backend (`product-mono`) change.
- **`aomi-build compile` is NOT the producer of the manifest Aomi Build reads.** Builder app releases are published by `community-apps/.github/scripts/build_candidate.py`, which builds the cdylib with `cargo` directly and never invokes `compile`. Verified 2026-07-10 against the public repo.
- An app pins an exact `aomi-sdk` version (`aomi-sdk = "=3.0.2"`, a crates.io dep). The `manifest` subcommand must ship in a new SDK release before apps pinning it can be gated; apps on older pins get no `secrets` key and are simply not gated.
- Adding `secrets` to a plugin entry is backward compatible: product-mono's `AppEntry` (`crates/runtime/src/app/mod.rs:63`) has no `deny_unknown_fields`, and `verify_tarball` reads only `file`/`sha256`.
- Secret **values** are never read back. The vault returns key names only. Never render or log a value.
- Slot shape is fixed by the SDK: `{ name: string, description: string, required: bool }`.
- Vault handles are `$SECRET:APP:<app>::<KEY>`; display strips to `<KEY>`.
- Env-var names are case-sensitive. Do **not** case-fold when matching slot names to configured keys.
- An app that declares no slots must activate exactly as it does today (no gate, no behaviour change).
- The `activate` BFF route exists in **three** copies and all three must stay in sync:
  `apps/build/src/server/bff/launch/routes.ts`, `apps/portal/src/server/bff/launch/routes.ts`, `packages/deploy/src/bff/launch-routes.ts`.
- Commit after every task. Never mark a task done with failing tests.

---

## File Structure

**`aomi-sdk`:**
- Modify `sdk/bin/build/compile/validate.rs` — expose the manifest it already reads (Task 1: `inspect_plugin`; Task 2: `read_manifest` becomes `pub(crate)`).
- Create `sdk/bin/build/manifest.rs` — the `aomi-build manifest --lib <path>` subcommand.
- Modify `sdk/bin/build/main.rs` — register the subcommand.

**`aomi-labs/community-apps`** (clone fresh, PR only):
- Modify `.github/scripts/build_candidate.py` — call `aomi-build manifest`, record `secrets` per plugin entry.
- Create `.github/scripts/test_build_candidate.py` — unit tests for the new helper.

**`aomi-widget`:**
- Modify `packages/deploy/src/types.ts` — `SecretSlot`, `ReleaseManifest`.
- Create `packages/deploy/src/secrets.ts` — `missingRequiredSecrets` (pure).
- Create `packages/deploy/src/bff/release-manifest.ts` — fetch + parse the GitHub release asset.
- Modify the three `launch` route files — 409 backstop.
- Create `apps/build/src/app/api/bff/deployments/required-secrets/route.ts` + handler.
- Modify `apps/build/.../tabs/environment-tab.tsx`, `deploy-step.tsx`, `deploy-dashboard.tsx` — the gate.

---

## Task 1: Expose the manifest `compile` already reads (aomi-sdk)

`validate_plugin` reads the `DynManifest` then discards it. Return it instead.

**Files:**
- Modify: `/Users/han/github/aomi-sdk/sdk/bin/build/compile/validate.rs:116-133`
- Modify: `/Users/han/github/aomi-sdk/sdk/bin/build/compile/mod.rs:128`
- Test: `/Users/han/github/aomi-sdk/sdk/bin/build/compile/validate.rs` (inline `#[cfg(test)]`)

**Interfaces:**
- Consumes: nothing.
- Produces: `pub fn inspect_plugin(lib_path: &Path) -> Result<DynManifest, Vec<String>>`. On success the manifest is returned; on failure the existing error strings. `validate_plugin` is removed; `mod.rs` is its only caller.

- [ ] **Step 1: Write the failing test**

Append to `sdk/bin/build/compile/validate.rs`:

```rust
#[cfg(test)]
mod inspect_tests {
    use super::*;

    #[test]
    fn inspect_plugin_reports_errors_for_a_missing_library() {
        let errors = inspect_plugin(Path::new("/nonexistent/libnope.so"))
            .expect_err("a missing library must not inspect cleanly");
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("dlopen"), "got: {}", errors[0]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-sdk && cargo test -p aomi-sdk --features cli --bin aomi-build inspect_plugin_reports_errors -- --nocapture`
Expected: FAIL — `cannot find function 'inspect_plugin' in this scope`.

- [ ] **Step 3: Write minimal implementation**

In `validate.rs`, replace `validate_plugin` (lines 116-133) with:

```rust
/// Load a built plugin, read its manifest, and validate it.
///
/// Returns the manifest on success, or the list of validation errors.
pub fn inspect_plugin(lib_path: &Path) -> Result<DynManifest, Vec<String>> {
    let manifest = match read_manifest(lib_path) {
        Ok(m) => m,
        Err(e) => return Err(vec![format!("{}: {e}", lib_path.display())]),
    };

    let mut errors = validate_manifest(&manifest);
    if manifest.sdk_version != AOMI_SDK_VERSION {
        errors.push(format!(
            "{}: plugin sdk_version '{}' does not match repo sdk version '{}'",
            manifest.name, manifest.sdk_version, AOMI_SDK_VERSION
        ));
    }

    if errors.is_empty() {
        Ok(manifest)
    } else {
        Err(errors)
    }
}
```

In `mod.rs`, replace the block at line 128:

```rust
        let plugin_manifest = match validate::inspect_plugin(&dest) {
            Ok(manifest) => manifest,
            Err(validation_errors) => {
                for err in &validation_errors {
                    eprintln!("  validation error: {err}");
                }
                eprintln!("  [SKIP] {pkg_name} — validation failed");
                let _ = fs::remove_file(&dest);
                failed.push(manifest.package_name);
                continue;
            }
        };
```

Then immediately after, collect it (declare `let mut plugin_manifests: Vec<(String, DynManifest)> = Vec::new();` next to `let mut failed` near the top of the loop's enclosing function):

```rust
        plugin_manifests.push((manifest_name.clone(), plugin_manifest));
```

Add `use aomi_sdk::DynManifest;` to `mod.rs` imports if absent.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/aomi-sdk && cargo test -p aomi-sdk --features cli --bin aomi-build inspect_plugin_reports_errors`
Expected: PASS (1 passed).

Run: `cargo build -p aomi-sdk --features cli --bin aomi-build`
Expected: builds clean, no `validate_plugin` references remain.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-sdk
git add sdk/bin/build/compile/validate.rs sdk/bin/build/compile/mod.rs
git commit -m "refactor(compile): return the plugin manifest from validation

validate_plugin dlopened each plugin, read its DynManifest, then discarded
it. Rename to inspect_plugin and return the manifest so the caller can
persist the declared secret slots."
```

---

## Task 2: `aomi-build manifest` subcommand (aomi-sdk)

**Why this shape:** the release that Aomi Build reads is published by
`aomi-labs/community-apps/.github/scripts/build_candidate.py`, which builds the
cdylib with `cargo` directly and **never calls `aomi-build compile`**. The
emitter must therefore be a standalone command that Python can invoke. Python
cannot reasonably `dlopen` the Rust ABI itself.

**Files:**
- Modify: `/Users/han/github/aomi-sdk/sdk/bin/build/compile/validate.rs` (make `read_manifest` `pub(crate)`)
- Create: `/Users/han/github/aomi-sdk/sdk/bin/build/manifest.rs`
- Modify: `/Users/han/github/aomi-sdk/sdk/bin/build/main.rs` (register the subcommand)

**Interfaces:**
- Consumes: `read_manifest` from Task 1's module.
- Produces:
  - CLI: `aomi-build manifest --lib <path/to/libfoo.so>` prints the plugin's `DynManifest` as pretty JSON on stdout, exit 0. On failure prints the error to stderr and exits 1.
  - `pub(crate) fn manifest_json(lib: &Path) -> Result<String, String>`

> **Do not** reuse `inspect_plugin` here. It compares `manifest.sdk_version`
> against the *building* SDK's version and would reject a plugin built by a
> different SDK release. This command must read the manifest, nothing more.

- [ ] **Step 1: Write the failing test**

Create `sdk/bin/build/manifest.rs`:

```rust
//! `aomi-build manifest --lib <path>` — print a built plugin's DynManifest as
//! JSON. Consumed by platform-repo CI (community-apps `build_candidate.py`) to
//! record each app's declared secret slots in the release `manifest.json`.

use clap::Args;
use std::path::{Path, PathBuf};

use crate::compile::validate::read_manifest;

#[derive(Args, Debug)]
pub struct ManifestArgs {
    /// Path to the built cdylib (`.so` / `.dylib`).
    #[arg(long)]
    pub lib: PathBuf,
}

pub(crate) fn manifest_json(lib: &Path) -> Result<String, String> {
    let manifest = read_manifest(lib)?;
    serde_json::to_string_pretty(&manifest).map_err(|e| format!("serialize manifest: {e}"))
}

pub fn run(args: ManifestArgs) -> anyhow::Result<()> {
    match manifest_json(&args.lib) {
        Ok(json) => {
            println!("{json}");
            Ok(())
        }
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_json_errors_for_a_missing_library() {
        let err = manifest_json(Path::new("/nonexistent/libnope.so"))
            .expect_err("a missing library must not produce a manifest");
        assert!(err.contains("dlopen"), "got: {err}");
    }

    #[test]
    fn a_manifest_with_secrets_serializes_the_slots() {
        // Guards the exact contract build_candidate.py depends on:
        // `secrets` is an array of {name, description, required}.
        use aomi_sdk::{DynManifest, SecretSlot};
        let manifest = DynManifest {
            sdk_version: "3.0.2".into(),
            name: "binance".into(),
            version: "0.1.0".into(),
            preamble: String::new(),
            tools: vec![],
            namespaces: None,
            secrets: Some(vec![SecretSlot {
                name: "BINANCE_API_KEY".into(),
                description: "Binance dashboard API key.".into(),
                required: true,
            }]),
            ..Default::default()
        };
        let json: serde_json::Value =
            serde_json::from_str(&serde_json::to_string(&manifest).unwrap()).unwrap();
        assert_eq!(json["secrets"][0]["name"], "BINANCE_API_KEY");
        assert_eq!(json["secrets"][0]["required"], true);
    }
}
```

If `DynManifest` does not implement `Default`, construct it field-by-field
instead of using `..Default::default()` — do not add a `Default` impl to the SDK.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-sdk && cargo test -p aomi-sdk --features cli --bin aomi-build manifest_json_errors`
Expected: FAIL — module `manifest` is not declared in `main.rs`; `read_manifest` is private.

- [ ] **Step 3: Write minimal implementation**

In `sdk/bin/build/compile/validate.rs`, change the signature's visibility only:

```rust
pub(crate) fn read_manifest(path: &Path) -> Result<DynManifest, String> {
```

In `sdk/bin/build/compile/mod.rs`, re-export the module so `crate::compile::validate` resolves:

```rust
pub(crate) mod validate;
```

In `sdk/bin/build/main.rs`, declare the module, add the variant, and dispatch it:

```rust
mod manifest;
```

```rust
    /// Print a built plugin's manifest (including declared secret slots) as JSON.
    Manifest(manifest::ManifestArgs),
```

```rust
        Cmd::Manifest(args) => manifest::run(args),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/aomi-sdk && cargo test -p aomi-sdk --features cli --bin aomi-build manifest`
Expected: PASS (2 passed).

Run: `cargo clippy -p aomi-sdk --features cli --bin aomi-build -- -D warnings`
Expected: clean.

- [ ] **Step 5: Verify against a real plugin**

Run:
```bash
cd /Users/han/github/aomi-sdk
cargo run -p aomi-sdk --features cli --bin aomi-build -- compile
cargo run -p aomi-sdk --features cli --bin aomi-build -- manifest --lib plugins/$(ls plugins | grep -i binance | head -1)
```
Expected: JSON on stdout whose `secrets` array contains `BINANCE_API_KEY` and
`BINANCE_SECRET_KEY`, each with `required: true` and a non-empty `description`.

- [ ] **Step 6: Commit**

```bash
cd /Users/han/github/aomi-sdk
git add sdk/bin/build/manifest.rs sdk/bin/build/main.rs sdk/bin/build/compile/
git commit -m "feat(cli): aomi-build manifest --lib prints a plugin's DynManifest

Platform-repo CI builds app cdylibs directly and cannot dlopen the Rust ABI
from Python. This exposes the manifest -- and therefore each app's declared
secret slots -- as a callable command."
```

---

## Task 3: Emit `secrets` from community-apps CI (PR to a fourth repo)

**Repo:** `aomi-labs/community-apps` (public). Clone it fresh, branch
`feat/emit-declared-secrets`, and open a PR. **Do not merge.**

**Verified facts you must not re-derive:**
- `.github/scripts/build_candidate.py` writes the bundle manifest at ~line 404:
  `"plugins": { app_name: { "file": ..., "sha256": ... } }`, then
  `verify_tarball` compares the round-tripped manifest to that same dict and
  reads only `entry["file"]` / `entry["sha256"]`. Adding a `secrets` key is safe.
- `resolve_sdk_version(app_dir)` already returns the app's exact pinned
  `aomi-sdk` version (apps pin e.g. `aomi-sdk = "=3.0.2"`, a crates.io dep).
- The workflow (`.github/workflows/build-candidate.yml`, `ubuntu-latest`) already
  installs a Rust toolchain via `dtolnay/rust-toolchain@stable`.
- product-mono's runtime `AppEntry` has no `deny_unknown_fields`, so older
  readers ignore `secrets`.

**Interfaces:**
- Consumes: `aomi-build manifest --lib <path>` (Task 2).
- Produces: each `plugins[app_name]` entry gains `"secrets": [{name, description, required}]` when the app declares any.

- [ ] **Step 1: Clone and branch**

```bash
cd /tmp && rm -rf community-apps
gh repo clone aomi-labs/community-apps
cd community-apps && git checkout -b feat/emit-declared-secrets
```

- [ ] **Step 2: Write the failing test**

Add `.github/scripts/test_build_candidate.py`:

```python
import json, pathlib, sys, types, unittest
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import build_candidate as bc


class ReadPluginSecretsTests(unittest.TestCase):
    def test_returns_slots_from_the_manifest_command(self):
        bc.run = lambda cmd, **kw: json.dumps(
            {"name": "binance",
             "secrets": [{"name": "BINANCE_API_KEY", "description": "d", "required": True}]}
        )
        slots = bc.read_plugin_secrets(pathlib.Path("/tmp/libbinance.so"), "3.0.2")
        self.assertEqual(slots[0]["name"], "BINANCE_API_KEY")

    def test_returns_empty_when_the_sdk_lacks_the_subcommand(self):
        def boom(cmd, **kw):
            raise RuntimeError("unrecognized subcommand 'manifest'")
        bc.run = boom
        self.assertEqual(bc.read_plugin_secrets(pathlib.Path("/tmp/x.so"), "3.0.1"), [])

    def test_returns_empty_when_the_manifest_has_no_secrets(self):
        bc.run = lambda cmd, **kw: json.dumps({"name": "hello"})
        self.assertEqual(bc.read_plugin_secrets(pathlib.Path("/tmp/x.so"), "3.0.2"), [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /tmp/community-apps && python3 .github/scripts/test_build_candidate.py`
Expected: FAIL — `module 'build_candidate' has no attribute 'read_plugin_secrets'`.

- [ ] **Step 4: Write minimal implementation**

In `build_candidate.py`, add above `build_bundle` (or wherever `bundle_manifest`
is constructed):

```python
def read_plugin_secrets(plugin_path: pathlib.Path, sdk_version: str) -> list[dict[str, Any]]:
    """Declared secret slots for a built plugin, via `aomi-build manifest`.

    Installs the app's exact pinned aomi-sdk so the manifest reader matches the
    ABI the plugin was built against. Returns [] for any SDK release that
    predates the `manifest` subcommand -- a missing slot list must never fail a
    build, it only means the app cannot be secret-gated.
    """
    try:
        bin_root = pathlib.Path(tempfile.mkdtemp(prefix="aomi-build-cli-"))
        run([
            "cargo", "install", "aomi-sdk",
            "--version", f"={sdk_version}",
            "--features", "cli", "--bin", "aomi-build",
            "--locked", "--root", str(bin_root),
        ])
        output = run([str(bin_root / "bin" / "aomi-build"), "manifest", "--lib", str(plugin_path)])
        manifest = json.loads(output)
    except Exception as err:  # noqa: BLE001 - never fail the build over this
        print(f"::warning::could not read declared secrets for {plugin_path.name}: {err}")
        return []
    secrets = manifest.get("secrets") or []
    return secrets if isinstance(secrets, list) else []
```

Then, where `bundle_manifest` is built (~line 404), attach the slots:

```python
    entry: dict[str, Any] = {"file": final_plugin.name, "sha256": digest}
    secrets = read_plugin_secrets(final_plugin, sdk_version)
    if secrets:
        entry["secrets"] = secrets
    bundle_manifest = {
        "app_release_tag": release_tag,
        "sdk_version": sdk_version,
        "target": target,
        "commit": info["source_commit"],
        "plugins": {app_name: entry},
    }
```

Ensure `import tempfile` is present.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /tmp/community-apps && python3 .github/scripts/test_build_candidate.py`
Expected: PASS (3 passed).

- [ ] **Step 6: Open the PR**

```bash
cd /tmp/community-apps
git add .github/scripts/
git commit -m "feat(ci): record each app's declared secret slots in manifest.json

Runs `aomi-build manifest` (from the app's exact pinned aomi-sdk) against the
built cdylib and records the declared secrets per plugin. Apps on an SDK
without the subcommand get no secrets key and are simply not gated."
git push -u origin feat/emit-declared-secrets
gh pr create --draft --title "ci: record declared secret slots in manifest.json" \
  --body "Lets Aomi Build detect an app's required secrets before activation. Backward compatible: product-mono's AppEntry ignores unknown fields, and apps on an older SDK get no secrets key. Depends on the \`aomi-build manifest\` subcommand shipping in a new aomi-sdk release."
```

**Note the release-ordering dependency:** apps pin an exact `aomi-sdk` version.
The subcommand must ship in a new SDK release before any app pinning it can be
gated. Apps on older pins fall back to no secrets, which Task 5 already handles
by returning `{}`.

---

## Task 4: `SecretSlot` + `missingRequiredSecrets` (aomi-widget, packages/deploy)

**Files:**
- Modify: `/Users/han/github/aomi-widget/packages/deploy/src/types.ts`
- Create: `/Users/han/github/aomi-widget/packages/deploy/src/secrets.ts`
- Test: `/Users/han/github/aomi-widget/packages/deploy/test/secrets.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export interface SecretSlot { name: string; description: string; required: boolean }`
  - `export interface ReleaseManifestPlugin { file: string; sha256: string; secrets?: SecretSlot[] }`
  - `export interface ReleaseManifest { app_release_tag: string; sdk_version: string; target: string; commit: string; plugins: Record<string, ReleaseManifestPlugin> }`
  - `export function missingRequiredSecrets(slots: SecretSlot[] | undefined, configuredKeys: string[]): SecretSlot[]`

Declared locally, not imported from `packages/client` — this is the backend's wire shape and `deploy` must not depend on `client`.

- [ ] **Step 1: Write the failing test**

Create `packages/deploy/test/secrets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { missingRequiredSecrets, type SecretSlot } from "../src/secrets";

const slot = (name: string, required: boolean): SecretSlot => ({
  name,
  description: `${name} description`,
  required,
});

describe("missingRequiredSecrets", () => {
  it("returns required slots that have no configured key", () => {
    const missing = missingRequiredSecrets(
      [slot("BINANCE_API_KEY", true), slot("BINANCE_SECRET_KEY", true)],
      ["BINANCE_API_KEY"],
    );
    expect(missing.map((s) => s.name)).toEqual(["BINANCE_SECRET_KEY"]);
  });

  it("never gates on optional slots", () => {
    expect(missingRequiredSecrets([slot("DEBUG", false)], [])).toEqual([]);
  });

  it("returns nothing when every required slot is configured", () => {
    expect(missingRequiredSecrets([slot("A", true)], ["A"])).toEqual([]);
  });

  it("treats undefined or empty slots as no gate", () => {
    expect(missingRequiredSecrets(undefined, [])).toEqual([]);
    expect(missingRequiredSecrets([], [])).toEqual([]);
  });

  it("matches names case-sensitively (env vars are case-sensitive)", () => {
    const missing = missingRequiredSecrets([slot("API_KEY", true)], ["api_key"]);
    expect(missing.map((s) => s.name)).toEqual(["API_KEY"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-widget && pnpm exec vitest run packages/deploy/test/secrets.test.ts`
Expected: FAIL — cannot resolve `../src/secrets`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/deploy/src/secrets.ts`:

```ts
import type { SecretSlot } from "./types";

export type { SecretSlot };

/**
 * The required slots that have no value in the vault yet.
 *
 * `configuredKeys` are vault key NAMES (values are never readable). Matching is
 * case-sensitive because environment variable names are.
 */
export function missingRequiredSecrets(
  slots: SecretSlot[] | undefined,
  configuredKeys: string[],
): SecretSlot[] {
  if (!slots?.length) return [];
  const configured = new Set(configuredKeys);
  return slots.filter((slot) => slot.required && !configured.has(slot.name));
}
```

Append to `packages/deploy/src/types.ts`:

```ts
/** A secret an app declares via the SDK's `Secret::new(name, description, required)`. */
export interface SecretSlot {
  name: string;
  description: string;
  required: boolean;
}

export interface ReleaseManifestPlugin {
  file: string;
  sha256: string;
  secrets?: SecretSlot[];
}

/** The `manifest.json` asset published with every plugin release. */
export interface ReleaseManifest {
  app_release_tag: string;
  sdk_version: string;
  target: string;
  commit: string;
  plugins: Record<string, ReleaseManifestPlugin>;
}
```

Export both from `packages/deploy/src/index.ts`:

```ts
export { missingRequiredSecrets } from "./secrets";
export type { SecretSlot, ReleaseManifest, ReleaseManifestPlugin } from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/aomi-widget && pnpm exec vitest run packages/deploy/test/secrets.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add packages/deploy/src/secrets.ts packages/deploy/src/types.ts packages/deploy/src/index.ts packages/deploy/test/secrets.test.ts
git commit -m "feat(deploy): add SecretSlot types and missingRequiredSecrets"
```

---

## Task 5: Fetch the release manifest from GitHub (aomi-widget, packages/deploy)

**Files:**
- Create: `/Users/han/github/aomi-widget/packages/deploy/src/bff/release-manifest.ts`
- Test: `/Users/han/github/aomi-widget/packages/deploy/test/release-manifest.test.ts`

**Interfaces:**
- Consumes: `ReleaseManifest`, `SecretSlot` (Task 4).
- Produces: `export async function fetchReleaseSecretSlots(input: { platformRepo: string; releaseTag: string; githubToken: string; fetchImpl?: typeof fetch }): Promise<Record<string, SecretSlot[]>>` — maps app name → declared slots. Returns `{}` when the release or the asset is absent (an old release predating Task 2 must not break activation).

GitHub gives release assets via `GET /repos/{repo}/releases/tags/{tag}`, then the asset is downloaded from its `url` with `Accept: application/octet-stream` (works for private repos; `browser_download_url` does not).

- [ ] **Step 1: Write the failing test**

Create `packages/deploy/test/release-manifest.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchReleaseSecretSlots } from "../src/bff/release-manifest";

function fakeFetch(routes: Record<string, { status: number; body: unknown }>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const hit = routes[url];
    if (!hit) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(hit.body), { status: hit.status });
  }) as unknown as typeof fetch;
}

const RELEASE_URL =
  "https://api.github.com/repos/aomi-labs/community/releases/tags/v1";

describe("fetchReleaseSecretSlots", () => {
  it("returns the declared slots per app", async () => {
    const fetchImpl = fakeFetch({
      [RELEASE_URL]: {
        status: 200,
        body: { assets: [{ name: "manifest.json", url: "https://api.github.com/asset/1" }] },
      },
      "https://api.github.com/asset/1": {
        status: 200,
        body: {
          plugins: {
            binance: {
              file: "libbinance.dylib",
              sha256: "x",
              secrets: [
                { name: "BINANCE_API_KEY", description: "d", required: true },
              ],
            },
          },
        },
      },
    });

    const slots = await fetchReleaseSecretSlots({
      platformRepo: "aomi-labs/community",
      releaseTag: "v1",
      githubToken: "t",
      fetchImpl,
    });

    expect(slots.binance.map((s) => s.name)).toEqual(["BINANCE_API_KEY"]);
  });

  it("returns {} when the release has no manifest.json (older releases)", async () => {
    const fetchImpl = fakeFetch({
      [RELEASE_URL]: { status: 200, body: { assets: [] } },
    });
    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });

  it("returns {} when the release does not exist", async () => {
    const fetchImpl = fakeFetch({});
    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-widget && pnpm exec vitest run packages/deploy/test/release-manifest.test.ts`
Expected: FAIL — cannot resolve `../src/bff/release-manifest`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/deploy/src/bff/release-manifest.ts`:

```ts
import type { ReleaseManifest, SecretSlot } from "../types";

const GITHUB_API = "https://api.github.com";

type ReleaseAsset = { name: string; url: string };

/**
 * Read the declared secret slots out of a release's `manifest.json` asset.
 *
 * Returns `{}` for any release that predates `aomi-build compile` writing the
 * slots, so activation of an older release is never blocked by their absence.
 */
export async function fetchReleaseSecretSlots(input: {
  platformRepo: string;
  releaseTag: string;
  githubToken: string;
  fetchImpl?: typeof fetch;
}): Promise<Record<string, SecretSlot[]>> {
  const doFetch = input.fetchImpl ?? fetch;
  const headers = {
    authorization: `Bearer ${input.githubToken}`,
    "x-github-api-version": "2022-11-28",
  };

  const releaseUrl = `${GITHUB_API}/repos/${input.platformRepo}/releases/tags/${encodeURIComponent(input.releaseTag)}`;
  const releaseRes = await doFetch(releaseUrl, {
    headers: { ...headers, accept: "application/vnd.github+json" },
  });
  if (!releaseRes.ok) return {};

  const release = (await releaseRes.json()) as { assets?: ReleaseAsset[] };
  const asset = release.assets?.find((a) => a.name === "manifest.json");
  if (!asset) return {};

  // The asset `url` (not browser_download_url) honours the bearer token, so
  // this works for private platform repos too.
  const assetRes = await doFetch(asset.url, {
    headers: { ...headers, accept: "application/octet-stream" },
  });
  if (!assetRes.ok) return {};

  const manifest = (await assetRes.json()) as ReleaseManifest;
  const slots: Record<string, SecretSlot[]> = {};
  for (const [app, plugin] of Object.entries(manifest.plugins ?? {})) {
    slots[app] = plugin.secrets ?? [];
  }
  return slots;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/aomi-widget && pnpm exec vitest run packages/deploy/test/release-manifest.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add packages/deploy/src/bff/release-manifest.ts packages/deploy/test/release-manifest.test.ts
git commit -m "feat(deploy): read declared secret slots from a release manifest.json"
```

---

## Task 6: 409 backstop on the `activate` route (all three copies)

Repeat identically in all three files. The route already resolves `source` via `findOwnedSource` and validates each `(app, releaseTag)` pair, so the release tag and app names are in hand.

**Files:**
- Modify: `/Users/han/github/aomi-widget/packages/deploy/src/bff/release-manifest.ts` (add the shared helper)
- Modify: `/Users/han/github/aomi-widget/apps/build/src/server/bff/launch/routes.ts` (`activateLaunchRoute`)
- Modify: `/Users/han/github/aomi-widget/apps/portal/src/server/bff/launch/routes.ts` (`activateLaunchRoute`)
- Modify: `/Users/han/github/aomi-widget/packages/deploy/src/bff/launch-routes.ts` (`activate`)
- Test: `packages/deploy/test/release-manifest.test.ts`, the matching `routes.test.ts` in each app, and `packages/deploy/test/launch-routes.test.ts`

**Interfaces:**
- Consumes: `fetchReleaseSecretSlots` (Task 5), `missingRequiredSecrets` (Task 4), `listAppSecrets` (existing, `client.ts:911`).
- Produces:
  - `export async function missingSecretsForActivation(input: { client: DeploymentClient; githubUserId: string; platform: string; source: UserSource; pairs: { app: string; releaseTag: string }[]; githubToken?: string }): Promise<Record<string, string[]>>` — exported from `packages/deploy/src/bff/release-manifest.ts` and re-exported from `@aomi-labs/deploy/bff`.
  - On unfilled required slots, HTTP **409** with body `{ error: "missing required secrets", missing: Record<appName, string[]> }`.

> **Plan amendment (2026-07-10, approved):** the helper is defined **once** in
> `packages/deploy` and imported by all three routes. Do **not** copy its body
> into each route file. Each route contributes only the 8-line call-and-409
> block below.

- [ ] **Step 1: Write the failing test (aomi-build copy)**

Add to `apps/build/src/server/bff/launch/routes.test.ts`, inside the `activateLaunchRoute` describe block:

```ts
  it("409s when a required secret is unfilled", async () => {
    setSession({ githubUserId: "gh-1", githubLogin: "octocat" });
    client.listUserSources.mockResolvedValue([
      { id: 42, apps: [{ name: "binance", appReleaseTag: "v1" }], latestDeployment: null },
    ]);
    client.listUserSourceDeployments.mockResolvedValue([
      { apps: [{ name: "binance", releaseTag: "v1" }] },
    ]);
    client.listAppSecrets.mockResolvedValue({ byApp: { binance: ["BINANCE_API_KEY"] } });
    fetchReleaseSecretSlots.mockResolvedValue({
      binance: [
        { name: "BINANCE_API_KEY", description: "d", required: true },
        { name: "BINANCE_SECRET_KEY", description: "d", required: true },
      ],
    });

    const res = await activateLaunchRoute(
      postJson({ appSourceId: 42, apps: ["binance"], releaseTags: ["v1"] }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "missing required secrets",
      missing: { binance: ["BINANCE_SECRET_KEY"] },
    });
    expect(client.activate).not.toHaveBeenCalled();
  });

  it("activates when the app declares no secrets", async () => {
    setSession({ githubUserId: "gh-1", githubLogin: "octocat" });
    client.listUserSources.mockResolvedValue([
      { id: 42, apps: [{ name: "hello", appReleaseTag: "v1" }], latestDeployment: null },
    ]);
    client.listUserSourceDeployments.mockResolvedValue([
      { apps: [{ name: "hello", releaseTag: "v1" }] },
    ]);
    client.listAppSecrets.mockResolvedValue({ byApp: {} });
    fetchReleaseSecretSlots.mockResolvedValue({});
    client.activate.mockResolvedValue({ ok: true, activation: { apps: [] } });

    const res = await activateLaunchRoute(
      postJson({ appSourceId: 42, apps: ["hello"], releaseTags: ["v1"] }),
    );

    expect(res.status).toBe(200);
    expect(client.activate).toHaveBeenCalledTimes(1);
  });
```

Mock the module at the top of the test file:

```ts
const fetchReleaseSecretSlots = vi.fn();
vi.mock("@aomi-labs/deploy/bff", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchReleaseSecretSlots: (...args: unknown[]) => fetchReleaseSecretSlots(...args),
}));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-widget && pnpm --filter aomi-build exec vitest run src/server/bff/launch/routes.test.ts -t "required secret"`
Expected: FAIL — got 200, `client.activate` was called.

- [ ] **Step 3: Write minimal implementation**

First add the shared helper **once**, at the bottom of
`packages/deploy/src/bff/release-manifest.ts`:

```ts
import type { DeploymentClient } from "../client";
import type { UserSource } from "../types";
import { missingRequiredSecrets } from "../secrets";

/**
 * Required slots the apps declare (from each release's manifest.json) that have
 * no value in the vault yet, keyed by app name. Empty object = safe to activate.
 *
 * Returns `{}` when the GitHub token or the source's platform repo is unknown —
 * activation must never be blocked by our inability to read the manifest.
 */
export async function missingSecretsForActivation(input: {
  client: DeploymentClient;
  githubUserId: string;
  platform: string;
  source: UserSource;
  pairs: { app: string; releaseTag: string }[];
  githubToken?: string;
}): Promise<Record<string, string[]>> {
  const githubToken = input.githubToken ?? process.env.GITHUB_TOKEN?.trim();
  const platformRepo = input.source.latestDeployment?.platformRepo;
  if (!githubToken || !platformRepo) return {};

  const configured = await input.client.listAppSecrets({
    githubUserId: input.githubUserId,
    platform: input.platform,
    sourceId: input.source.id,
  });

  const missing: Record<string, string[]> = {};
  for (const pair of input.pairs) {
    const slots = await fetchReleaseSecretSlots({
      platformRepo,
      releaseTag: pair.releaseTag,
      githubToken,
    });
    const configuredKeys = (configured.byApp[pair.app] ?? []).map(
      (handle) => handle.split("::").pop() ?? handle,
    );
    const unfilled = missingRequiredSecrets(slots[pair.app], configuredKeys);
    if (unfilled.length > 0) {
      missing[pair.app] = unfilled.map((slot) => slot.name);
    }
  }
  return missing;
}
```

Export it from `packages/deploy/src/bff/index.ts` so `@aomi-labs/deploy/bff` exposes it.

Add a test for it in `packages/deploy/test/release-manifest.test.ts`:

```ts
it("reports only the required slots with no configured key", async () => {
  const client = {
    listAppSecrets: vi.fn(async () => ({
      byApp: { binance: ["$SECRET:APP:binance::BINANCE_API_KEY"] },
    })),
  } as unknown as import("../src/client").DeploymentClient;

  const missing = await missingSecretsForActivation({
    client,
    githubUserId: "gh-1",
    platform: "community",
    githubToken: "t",
    source: {
      id: 42,
      latestDeployment: { platformRepo: "aomi-labs/community" },
    } as never,
    pairs: [{ app: "binance", releaseTag: "v1" }],
  });
  expect(missing).toEqual({ binance: ["BINANCE_SECRET_KEY"] });
});

it("never blocks activation when the platform repo is unknown", async () => {
  const client = { listAppSecrets: vi.fn() } as never;
  const missing = await missingSecretsForActivation({
    client,
    githubUserId: "gh-1",
    platform: "community",
    githubToken: "t",
    source: { id: 42, latestDeployment: null } as never,
    pairs: [{ app: "binance", releaseTag: "v1" }],
  });
  expect(missing).toEqual({});
});
```

(The first test needs `fetchReleaseSecretSlots` stubbed to return the two binance slots — use `vi.spyOn` on the module, or inject via the existing `fetchImpl` seam.)

Then, in **each** of the three routes, immediately **after** the `authorized`
pair check and **before** `client.activate`, add only this call-and-409 block:

```ts
    const missingByApp = await missingSecretsForActivation({
      client,
      githubUserId: session.githubUserId,
      platform: config.platform,
      source,
      pairs,
    });
    if (Object.keys(missingByApp).length > 0) {
      return NextResponse.json(
        { error: "missing required secrets", missing: missingByApp },
        { status: 409 },
      );
    }
```

Import in the two app route files:

```ts
import { missingSecretsForActivation } from "@aomi-labs/deploy/bff";
```

In `packages/deploy/src/bff/launch-routes.ts` import from `./release-manifest`,
take the session from `getSession(req)`, use `cfg.platform`, and return
`jsonResponse({ ... }, 409)` instead of `NextResponse.json`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter aomi-build exec vitest run src/server/bff/launch/routes.test.ts`
Expected: PASS, all tests green.

Repeat Steps 1-4 verbatim for `apps/portal` and for `packages/deploy/test/launch-routes.test.ts` (in the package copy, `jsonResponse` replaces `NextResponse.json` and the session comes from `getSession(req)`).

Run all three:
```bash
pnpm --filter aomi-build exec vitest run src/server/bff/launch/routes.test.ts
pnpm --filter portal exec vitest run src/server/bff/launch/routes.test.ts
pnpm exec vitest run packages/deploy/test/launch-routes.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/build/src/server/bff/launch/routes.ts apps/portal/src/server/bff/launch/routes.ts packages/deploy/src/bff/launch-routes.ts apps/build/src/server/bff/launch/routes.test.ts apps/portal/src/server/bff/launch/routes.test.ts packages/deploy/test/launch-routes.test.ts
git commit -m "feat(bff): 409 activate when required secrets are unfilled

Applied to all three copies of the activate route so the portal and the
package BFF inherit the backstop."
```

---

## Task 7: `required-secrets` BFF route (aomi-build)

The UI needs the slots + missing set for the project page and wizard.

**Files:**
- Create: `/Users/han/github/aomi-widget/apps/build/src/app/api/bff/deployments/required-secrets/route.ts`
- Modify: `/Users/han/github/aomi-widget/apps/build/src/server/bff/launch/routes.ts` (add `requiredSecretsRoute`)
- Modify: `/Users/han/github/aomi-widget/apps/build/src/lib/api-paths.ts`
- Modify: `/Users/han/github/aomi-widget/apps/build/src/features/launch/client.ts`
- Test: `apps/build/src/server/bff/launch/routes.test.ts`

**Interfaces:**
- Consumes: `missingSecretsForActivation` internals from Task 6 — reuse `fetchReleaseSecretSlots` + `missingRequiredSecrets`.
- Produces:
  - BFF: `GET /api/bff/deployments/required-secrets?appSourceId=<n>` →
    `{ byApp: Record<appName, { slots: SecretSlot[]; missing: string[] }> }`
  - Client: `export function deploymentRequiredSecrets(input: { appSourceId: number }): Promise<RequiredSecretsResult>`

- [ ] **Step 1: Write the failing test**

```ts
describe("requiredSecretsRoute", () => {
  it("returns slots and the missing set per app", async () => {
    setSession({ githubUserId: "gh-1", githubLogin: "octocat" });
    client.listUserSources.mockResolvedValue([
      {
        id: 42,
        apps: [{ name: "binance", appReleaseTag: "v1" }],
        latestDeployment: { platformRepo: "aomi-labs/community", apps: [] },
      },
    ]);
    client.listAppSecrets.mockResolvedValue({
      byApp: { binance: ["$SECRET:APP:binance::BINANCE_API_KEY"] },
    });
    fetchReleaseSecretSlots.mockResolvedValue({
      binance: [
        { name: "BINANCE_API_KEY", description: "d", required: true },
        { name: "BINANCE_SECRET_KEY", description: "d2", required: true },
      ],
    });

    const res = await requiredSecretsRoute(getReq("?appSourceId=42"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      byApp: {
        binance: {
          slots: [
            { name: "BINANCE_API_KEY", description: "d", required: true },
            { name: "BINANCE_SECRET_KEY", description: "d2", required: true },
          ],
          missing: ["BINANCE_SECRET_KEY"],
        },
      },
    });
  });

  it("401s without a GitHub session", async () => {
    clearSession();
    const res = await requiredSecretsRoute(getReq("?appSourceId=42"));
    expect(res.status).toBe(401);
  });

  it("404s for a source the user does not own", async () => {
    setSession({ githubUserId: "gh-1", githubLogin: "octocat" });
    client.listUserSources.mockResolvedValue([]);
    const res = await requiredSecretsRoute(getReq("?appSourceId=99"));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter aomi-build exec vitest run src/server/bff/launch/routes.test.ts -t requiredSecretsRoute`
Expected: FAIL — `requiredSecretsRoute` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to `apps/build/src/server/bff/launch/routes.ts`:

```ts
export async function requiredSecretsRoute(req: Request) {
  const blocked = checkRead(req);
  if (blocked) return blocked;

  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const appSourceId = Number(
    new URL(req.url).searchParams.get("appSourceId"),
  );
  if (!isValidAppSourceId(appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      config.platform,
      appSourceId,
    );
    if (!source) {
      return NextResponse.json(
        { error: "app source not found for this user" },
        { status: 404 },
      );
    }

    const githubToken = process.env.GITHUB_TOKEN?.trim();
    const platformRepo = source.latestDeployment?.platformRepo;
    const configured = await client.listAppSecrets({
      githubUserId: session.githubUserId,
      platform: config.platform,
      sourceId: source.id,
    });

    const byApp: Record<string, { slots: SecretSlot[]; missing: string[] }> = {};
    for (const app of source.apps) {
      const releaseTag = app.appReleaseTag;
      const slots =
        githubToken && platformRepo && releaseTag
          ? ((
              await fetchReleaseSecretSlots({
                platformRepo,
                releaseTag,
                githubToken,
              })
            )[app.name] ?? [])
          : [];
      const configuredKeys = (configured.byApp[app.name] ?? []).map(
        (handle) => handle.split("::").pop() ?? handle,
      );
      byApp[app.name] = {
        slots,
        missing: missingRequiredSecrets(slots, configuredKeys).map((s) => s.name),
      };
    }

    return NextResponse.json({ byApp });
  } catch (err) {
    return launchErrorResponse(err);
  }
}
```

Create `apps/build/src/app/api/bff/deployments/required-secrets/route.ts`:

```ts
import { requiredSecretsRoute } from "@build/server/bff/launch/routes";

export const GET = requiredSecretsRoute;
```

Add to `apps/build/src/lib/api-paths.ts` under `bff.deployments`:

```ts
      requiredSecrets: (appSourceId: number) =>
        `${BFF}/deployments/required-secrets?appSourceId=${appSourceId}`,
```

Add to `apps/build/src/features/launch/client.ts`:

```ts
export type RequiredSecretsResult = {
  byApp: Record<string, { slots: SecretSlot[]; missing: string[] }>;
};

export function deploymentRequiredSecrets(input: {
  appSourceId: number;
}): Promise<RequiredSecretsResult> {
  return getJson(
    API_PATHS.bff.deployments.requiredSecrets(input.appSourceId),
    "required secrets",
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter aomi-build exec vitest run src/server/bff/launch/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/build/src/app/api/bff/deployments/required-secrets apps/build/src/server/bff/launch/routes.ts apps/build/src/lib/api-paths.ts apps/build/src/features/launch/client.ts apps/build/src/server/bff/launch/routes.test.ts
git commit -m "feat(aomi-build): required-secrets BFF route"
```

---

## Task 8: Load required secrets into `useProjectDetail`

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/build/src/features/launch/hooks/use-project-detail.ts`
- Test: `/Users/han/github/aomi-widget/apps/build/src/features/launch/hooks/use-project-detail.test.ts`

**Interfaces:**
- Consumes: `deploymentRequiredSecrets` (Task 7).
- Produces, on the hook's return value:
  - `requiredSecrets: Record<string, { slots: SecretSlot[]; missing: string[] }> | null`
  - `requiredSecretsError: string | null`
  - `loadRequiredSecrets(): void`
  - `hasMissingSecrets(app: string): boolean`

Follow the existing `recordsError` pattern (surface errors; reset the request ref on failure so a retry is possible). Do **not** copy the old swallow-into-empty pattern.

- [ ] **Step 1: Write the failing test**

```ts
it("exposes the missing required secrets per app", async () => {
  deploymentRequiredSecrets.mockResolvedValue({
    byApp: { binance: { slots: [], missing: ["BINANCE_SECRET_KEY"] } },
  });
  const { result } = renderHook(() => useProjectDetail(42));
  act(() => result.current.loadRequiredSecrets());
  await waitFor(() => expect(result.current.requiredSecrets).not.toBeNull());
  expect(result.current.hasMissingSecrets("binance")).toBe(true);
  expect(result.current.hasMissingSecrets("hello")).toBe(false);
});

it("surfaces a required-secrets load failure instead of a false empty state", async () => {
  deploymentRequiredSecrets.mockRejectedValue(new Error("boom"));
  const { result } = renderHook(() => useProjectDetail(42));
  act(() => result.current.loadRequiredSecrets());
  await waitFor(() => expect(result.current.requiredSecretsError).toBe("boom"));
  expect(result.current.requiredSecrets).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter aomi-build exec vitest run src/features/launch/hooks/use-project-detail.test.ts -t "required secrets"`
Expected: FAIL — `loadRequiredSecrets is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
const [requiredSecrets, setRequiredSecrets] = useState<Record<
  string,
  { slots: SecretSlot[]; missing: string[] }
> | null>(null);
const [requiredSecretsError, setRequiredSecretsError] = useState<string | null>(null);
const requiredSecretsReq = useRef(false);

const loadRequiredSecrets = useCallback(() => {
  if (requiredSecretsReq.current || requiredSecrets !== null) return;
  requiredSecretsReq.current = true;
  setRequiredSecretsError(null);
  void deploymentRequiredSecrets({ appSourceId: sourceId })
    .then((r) => setRequiredSecrets(r.byApp))
    .catch((err) => {
      setRequiredSecretsError(
        err instanceof Error ? err.message : "Failed to load required secrets",
      );
      requiredSecretsReq.current = false;
    });
}, [sourceId, requiredSecrets]);

const hasMissingSecrets = useCallback(
  (app: string) => (requiredSecrets?.[app]?.missing.length ?? 0) > 0,
  [requiredSecrets],
);
```

Return `requiredSecrets`, `requiredSecretsError`, `loadRequiredSecrets`, `hasMissingSecrets`. After a successful `setEnvVars`, also clear `requiredSecrets` and reset `requiredSecretsReq.current = false` so the gate re-evaluates:

```ts
    setRequiredSecrets(null);
    requiredSecretsReq.current = false;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter aomi-build exec vitest run src/features/launch/hooks/use-project-detail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/build/src/features/launch/hooks/use-project-detail.ts apps/build/src/features/launch/hooks/use-project-detail.test.ts
git commit -m "feat(aomi-build): expose required-secret state from useProjectDetail"
```

---

## Task 9: Prefilled required-secret rows in the Environment tab

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/build/src/features/launch/components/deployments/tabs/environment-tab.tsx`
- Test: `.../tabs/environment-tab.test.tsx`

**Interfaces:**
- Consumes: `detail.requiredSecrets`, `detail.loadRequiredSecrets` (Task 8).
- Produces: no new exports.

Required slots become named, explained, mandatory rows in the existing **Secrets** section: `name` prefilled and read-only, `description` as helper text, masked value input.

- [ ] **Step 1: Write the failing test**

```tsx
it("renders each missing required slot with its description and a masked input", () => {
  const detail = makeDetail({
    requiredSecrets: {
      binance: {
        slots: [
          { name: "BINANCE_API_KEY", description: "Binance dashboard API key.", required: true },
        ],
        missing: ["BINANCE_API_KEY"],
      },
    },
  });
  render(<EnvironmentTab detail={detail} />);

  expect(screen.getByText("Binance dashboard API key.")).toBeInTheDocument();
  const input = screen.getByLabelText("BINANCE_API_KEY value");
  expect(input).toHaveAttribute("type", "password");
  expect(screen.getByDisplayValue("BINANCE_API_KEY")).toHaveAttribute("readonly");
});

it("shows a required banner listing the missing slots", () => {
  const detail = makeDetail({
    requiredSecrets: { binance: { slots: [], missing: ["A", "B"] } },
  });
  render(<EnvironmentTab detail={detail} />);
  expect(screen.getByText(/2 required secrets missing/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter aomi-build exec vitest run src/features/launch/components/deployments/tabs/environment-tab.test.tsx -t "required"`
Expected: FAIL — no such text/label.

- [ ] **Step 3: Write minimal implementation**

Call `detail.loadRequiredSecrets()` in the existing mount effect. Derive:

```tsx
const required = app ? detail.requiredSecrets?.[app] : undefined;
const missingSlots = (required?.slots ?? []).filter((slot) =>
  required?.missing.includes(slot.name),
);
```

Above the Secrets `ValueEditor`, render the banner and the prefilled rows:

```tsx
{missingSlots.length > 0 && (
  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
    {missingSlots.length} required secret{missingSlots.length === 1 ? "" : "s"} missing.
    This app cannot be activated until every required value is set.
  </div>
)}

{missingSlots.map((slot) => (
  <div key={slot.name} className="mb-2">
    <div className="flex items-center gap-2">
      <input
        value={slot.name}
        readOnly
        aria-label={`${slot.name} key`}
        className="h-8 w-56 rounded-md border border-zinc-300 bg-zinc-50 px-2 font-mono text-xs"
      />
      <input
        type="password"
        value={requiredValues[slot.name] ?? ""}
        onChange={(e) =>
          setRequiredValues((v) => ({ ...v, [slot.name]: e.target.value }))
        }
        placeholder="value"
        aria-label={`${slot.name} value`}
        className="h-8 flex-1 rounded-md border border-zinc-300 px-2 text-xs"
      />
    </div>
    <p className="mt-1 text-xs text-zinc-500">{slot.description}</p>
  </div>
))}
```

Add `const [requiredValues, setRequiredValues] = useState<Record<string, string>>({})`, and fold `requiredValues` into the `save()` payload alongside `envRows` and `secretRows`, clearing it on success.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter aomi-build exec vitest run src/features/launch/components/deployments/tabs/environment-tab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/build/src/features/launch/components/deployments/tabs/environment-tab.tsx apps/build/src/features/launch/components/deployments/tabs/environment-tab.test.tsx
git commit -m "feat(aomi-build): prefill required secret slots in the Environment tab"
```

---

## Task 10: Gate the Activate button in both call sites

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/build/src/features/launch/components/deploy-dashboard.tsx` (`LifecyclePanel`)
- Modify: `/Users/han/github/aomi-widget/apps/build/src/features/launch/components/deploy-step.tsx` (`DeployStep`)
- Test: `.../deploy-dashboard.test.tsx`, `.../deploy-step.test.tsx`

**Interfaces:**
- Consumes: `detail.hasMissingSecrets(app)` (Task 8); the 409 body `{ error, missing }` (Task 6).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```tsx
it("disables Activate while a required secret is missing", () => {
  const detail = makeDetail({
    requiredSecrets: { binance: { slots: [], missing: ["BINANCE_API_KEY"] } },
  });
  render(<LifecyclePanel detail={detail} appSourceId={42} />);
  const button = screen.getByRole("button", { name: /activate/i });
  expect(button).toBeDisabled();
  expect(screen.getByText(/1 required secret missing/i)).toBeInTheDocument();
});

it("enables Activate once no required secret is missing", () => {
  const detail = makeDetail({
    requiredSecrets: { binance: { slots: [], missing: [] } },
  });
  render(<LifecyclePanel detail={detail} appSourceId={42} />);
  expect(screen.getByRole("button", { name: /activate/i })).toBeEnabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter aomi-build exec vitest run src/features/launch/components/deploy-dashboard.test.tsx -t "required secret"`
Expected: FAIL — button is enabled.

- [ ] **Step 3: Write minimal implementation**

In `LifecyclePanel`, compute the blocked set from the apps being activated:

```tsx
const blockedApps = lifecycle.appNames.filter((app) => detail.hasMissingSecrets(app));
const secretsBlocked = blockedApps.length > 0;
const missingCount = blockedApps.reduce(
  (n, app) => n + (detail.requiredSecrets?.[app]?.missing.length ?? 0),
  0,
);
```

Disable the button and explain why:

```tsx
<Button onClick={activate} disabled={action !== "idle" || secretsBlocked}>
  Activate
</Button>
{secretsBlocked && (
  <span className="text-xs text-amber-700">
    {missingCount} required secret{missingCount === 1 ? "" : "s"} missing — set
    them in the Environment tab.
  </span>
)}
```

Surface the 409 in the activate `catch` so a server-side rejection is legible:

```tsx
} catch (err) {
  const body = (err as { body?: { missing?: Record<string, string[]> } }).body;
  if (body?.missing) {
    const names = Object.entries(body.missing)
      .map(([app, keys]) => `${app}: ${keys.join(", ")}`)
      .join("; ");
    setError(`Missing required secrets — ${names}`);
  } else {
    setError(err instanceof Error ? err.message : String(err));
  }
  setAction("idle");
}
```

Apply the same gate in `DeployStep`'s activate button, using the slots for `progress.apps`.

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm --filter aomi-build exec vitest run src/features/launch/components/deploy-dashboard.test.tsx src/features/launch/components/deploy-step.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Full verification**

```bash
cd /Users/han/github/aomi-widget
pnpm --filter aomi-build type-check && pnpm --filter aomi-build lint
pnpm --filter portal type-check && pnpm --filter portal lint
pnpm --filter @aomi-labs/deploy build
pnpm exec vitest run packages/deploy/test/
pnpm --filter aomi-build exec vitest run
pnpm --filter portal exec vitest run
```
Expected: all green, 0 lint errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/han/github/aomi-widget
git add apps/build/src/features/launch/components/
git commit -m "feat(aomi-build): gate Activate on required secrets being filled

Disables Activate in both call sites while any required slot is unfilled and
renders the 409 missing-secret map when the server rejects an activation."
```

---

## Manual verification

1. `cd /Users/han/github/aomi-sdk && cargo run -p aomi-sdk --features cli --bin aomi-build -- compile && cargo run -p aomi-sdk --features cli --bin aomi-build -- manifest --lib plugins/<binance-lib>`
   → JSON whose `secrets` array holds `BINANCE_API_KEY` and `BINANCE_SECRET_KEY`, both `required: true`.
   Then `cd /tmp/community-apps && python3 .github/scripts/test_build_candidate.py` → 3 passed.
2. `cd /Users/han/github/aomi-widget && pnpm --filter aomi-build dev`, sign in via `/api/bff/auth/github/dev-session?login=octocat&id=1`.
3. Open a project whose app declares secrets → Environment tab shows an amber "2 required secrets missing" banner and two prefilled, read-only-key rows with descriptions and masked inputs.
4. Deployments tab → **Activate** is disabled, with "2 required secrets missing — set them in the Environment tab."
5. Fill both, Save → the banner clears and Activate enables.
6. Server backstop: with one secret removed,
   `curl -X POST localhost:3000/api/bff/launch/activate -H 'content-type: application/json' --cookie "aomi_github=<jwt>" -d '{"appSourceId":42,"apps":["binance"],"releaseTags":["v1"]}'`
   → **409** `{"error":"missing required secrets","missing":{"binance":["BINANCE_SECRET_KEY"]}}`.
7. An app declaring no secrets activates exactly as before (no banner, button enabled).

## Self-review notes

- **Spec coverage:** revised data source → Tasks 1-3, 5. `missingRequiredSecrets` → Task 4. UI gate (§3) → Tasks 8-10. 409 backstop (§4) → Task 6. Environment-tab banner (§3) → Task 9. Error handling (§"Error handling") → Task 8 (no fail-open, no silent empty) and Task 10 (409 rendered inline).
- **Backward compatibility:** `fetchReleaseSecretSlots` returns `{}` for releases predating Task 2, and `missingRequiredSecrets(undefined, …)` returns `[]`, so old releases activate unchanged. Covered by tests in Tasks 4, 5, 6.
- **Type consistency:** `SecretSlot` is defined once (Task 4, `packages/deploy/src/types.ts`) and reused everywhere. `missingRequiredSecrets(slots, configuredKeys)` keeps that signature in Tasks 6, 7. `fetchReleaseSecretSlots` returns `Record<appName, SecretSlot[]>` in Tasks 5, 6, 7. The BFF route returns `{ byApp: Record<app, { slots, missing }> }` in Tasks 7, 8, 9, 10.
- **Vault handles:** stripped with `handle.split("::").pop()` in Tasks 6 and 7, matching `environment-tab.tsx`'s existing display logic.

---

## Task 11: Extend secrets gating to the promote path (added 2026-07-10 after integration review)

**Why:** The project console (`ProjectPage` → `DeploymentsTab`) makes an app live via **`promote`** (`deploymentPromoteRoute` → `/api/platforms/:id/deployments/:id/promote`), NOT `activate`. The backend `promote_target` runs the same `prepare_activation_releases` machinery as activate, so promote is equally secret-sensitive — yet Tasks 6/10 only covered `activate`, leaving the primary live path with no 409 and no UI gate. Additionally the wizard's `DeployStep` gate is inert because `oneshot-wizard.tsx` never passes it a `detail`. This task closes all three.

**Files:**
- Modify (409 backstop, all three copies): `apps/build/src/server/bff/launch/routes.ts`, `apps/portal/src/server/bff/launch/routes.ts`, `packages/deploy/src/bff/launch-routes.ts` — the promote handler.
- Modify (UI gate): `apps/build/src/features/launch/components/deployments/tabs/deployments-tab.tsx`
- Modify (wizard wiring): `apps/build/src/features/launch/components/oneshot-wizard.tsx`
- Test: the three `routes.test.ts` / `launch-routes.test.ts`, and `deployments-tab.test.tsx`

**Interfaces:**
- Reuse `missingSecretsForActivation({ client, githubUserId, platform, source, pairs })` from `@aomi-labs/deploy/bff` (defined in Task 6) — do NOT write a second implementation.
- `client.listUserSourceDeployments({ githubUserId, platform, appSourceId, limit })` returns `UserSourceLatestDeployment[]`, each with `.deploymentId` and `.apps: { name: string; releaseTag: string | null }[]`.
- `DeploymentsTab` already has `detail` (useProjectDetail), `detail.hasMissingSecrets(app)`, `detail.loadRequiredSecrets()`, and per-row `deployment.apps: string[]`.

### Part A — 409 on the promote route (all three copies)

- [ ] **Step 1: Write the failing test (aomi-build copy)**

Add to `apps/build/src/server/bff/launch/routes.test.ts`, `deploymentPromoteRoute` block, following the existing global-`fetch`-stub pattern used by the Task 6 activate tests:

```ts
it("409s a promote when a required secret is unfilled", async () => {
  setSession({ githubUserId: "gh-1", githubLogin: "octocat" });
  // owned source, deployment in the source's records, one app + release tag
  stubOwnedSourceWithDeployment({
    sourceId: 42,
    platformRepo: "aomi-labs/community",
    deploymentId: "dep_1_r_abc",
    apps: [{ name: "binance", releaseTag: "v1" }],
  });
  stubAppSecrets({ binance: ["$SECRET:APP:binance::BINANCE_API_KEY"] });
  stubReleaseManifest({
    binance: [
      { name: "BINANCE_API_KEY", description: "d", required: true },
      { name: "BINANCE_SECRET_KEY", description: "d", required: true },
    ],
  });

  const res = await deploymentPromoteRoute(
    postJson({ deploymentId: "dep_1_r_abc", appSourceId: 42 }),
  );

  expect(res.status).toBe(409);
  await expect(res.json()).resolves.toEqual({
    error: "missing required secrets",
    missing: { binance: ["BINANCE_SECRET_KEY"] },
  });
  expect(client.promote).not.toHaveBeenCalled();
});

it("promotes when required secrets are filled", async () => {
  setSession({ githubUserId: "gh-1", githubLogin: "octocat" });
  stubOwnedSourceWithDeployment({
    sourceId: 42, platformRepo: "aomi-labs/community",
    deploymentId: "dep_1_r_abc", apps: [{ name: "binance", releaseTag: "v1" }],
  });
  stubAppSecrets({ binance: ["$SECRET:APP:binance::BINANCE_API_KEY", "$SECRET:APP:binance::BINANCE_SECRET_KEY"] });
  stubReleaseManifest({ binance: [
    { name: "BINANCE_API_KEY", description: "d", required: true },
    { name: "BINANCE_SECRET_KEY", description: "d", required: true },
  ] });
  client.promote.mockResolvedValue({ ok: true, promote: { releaseTags: ["v1"], status: "promoted" } });

  const res = await deploymentPromoteRoute(postJson({ deploymentId: "dep_1_r_abc", appSourceId: 42 }));
  expect(res.status).toBe(202);
  expect(client.promote).toHaveBeenCalledTimes(1);
});
```

(Adapt the stub helper names to whatever the existing test file uses — the Task 6 promote/activate tests already stub `listUserSources`, `listUserSourceDeployments`, `listAppSecrets`, and the release-manifest `fetch`. Match them.)

- [ ] **Step 2: Run to verify it fails** — `pnpm --filter aomi-build exec vitest run src/server/bff/launch/routes.test.ts -t "required secret"` → FAIL (got 202, `client.promote` called).

- [ ] **Step 3: Implement in each promote handler**, after the existing `known.has(deploymentId)` ownership check and BEFORE `client.promote(...)`:

```ts
    // Gate promotion on required secrets, exactly as activate does — promote
    // runs the same backend activation machinery.
    const deployments = await client.listUserSourceDeployments({
      githubUserId: session.githubUserId,
      platform: config.platform,
      appSourceId: source.id,
      limit: 100,
    });
    const target = deployments.find((d) => d.deploymentId === deploymentId);
    const pairs = (target?.apps ?? [])
      .filter((a) => (apps ? apps.includes(a.name) : true))
      .flatMap((a) => (a.releaseTag ? [{ app: a.name, releaseTag: a.releaseTag }] : []));
    const missingByApp = await missingSecretsForActivation({
      client,
      githubUserId: session.githubUserId,
      platform: config.platform,
      source,
      pairs,
    });
    if (Object.keys(missingByApp).length > 0) {
      return NextResponse.json(
        { error: "missing required secrets", missing: missingByApp },
        { status: 409 },
      );
    }
```

Import `missingSecretsForActivation` (already imported in these files for activate). In the package copy use `getSession(req)`'s session, `cfg.platform`, and `jsonResponse(body, 409)`.

- [ ] **Step 4: Run** the three suites (`routes.test.ts` ×2, `launch-routes.test.ts`) → PASS. Then `pnpm --filter @aomi-labs/deploy build`, `pnpm --filter aomi-build type-check`, `pnpm --filter portal type-check`.

### Part B — gate the promote button in DeploymentsTab

- [ ] **Step 5: Write the failing test** in `deployments-tab.test.tsx`:

```tsx
it("disables Promote for a deployment whose app has a missing required secret", () => {
  const detail = makeDetail({
    deployments: [{ deploymentId: "dep_1", apps: ["binance"], releaseTags: ["v1"], current: false }],
    requiredSecrets: { binance: { slots: [], missing: ["BINANCE_API_KEY"] } },
  });
  render(<DeploymentsTab detail={detail} />);
  expect(screen.getByRole("button", { name: /promote/i })).toBeDisabled();
});
```

- [ ] **Step 6: Implement.** In `DeploymentsTab`, call `detail.loadRequiredSecrets()` in the existing mount effect. For each deployment row, compute `const secretsBlocked = deployment.apps.some((app) => detail.hasMissingSecrets(app));` and AND it into the promote button's existing `disabled` (`disabled={deploying || secretsBlocked}`), with a short reason line when blocked ("required secrets missing — set them in the Environment tab"). Do not weaken the existing `deploying`/current-state conditions.

- [ ] **Step 7: Run** `pnpm --filter aomi-build exec vitest run src/features/launch/components/deployments/tabs/deployments-tab.test.tsx` → PASS.

### Part C — make the wizard gate live

- [ ] **Step 8:** In `oneshot-wizard.tsx`, the wizard has no `useProjectDetail`. `DeployStep` already accepts an optional `detail?: SecretsGateDetail` and calls `launchActivate` (so the 409 already protects it). Wiring a full `useProjectDetail` here is out of proportion. Instead, pass a minimal inline adapter built from a `useState`-held `deploymentRequiredSecrets` fetch keyed on `progress.appSourceId`, OR — if `progress.appSourceId` is not reliably present during the build step — leave `DeployStep` ungated in the wizard and rely on its 409 (already in place), and note this explicitly. Decide based on whether `progress.appSourceId` exists at the build step; do not fabricate a hook. If you leave it 409-only, say so in the report and add a one-line code comment in `oneshot-wizard.tsx` explaining the wizard relies on the server 409.

- [ ] **Step 9: Full verification**

```bash
cd /Users/han/github/aomi-widget
pnpm --filter aomi-build type-check && pnpm --filter aomi-build lint
pnpm --filter portal type-check && pnpm --filter portal lint
pnpm --filter @aomi-labs/deploy build && pnpm exec vitest run packages/deploy/test/
pnpm --filter aomi-build exec vitest run
pnpm --filter portal exec vitest run
```
All green, 0 lint errors.

- [ ] **Step 10: Commit**

```bash
git add apps/build/src/server/bff/launch/routes.ts apps/portal/src/server/bff/launch/routes.ts packages/deploy/src/bff/launch-routes.ts apps/build/src/features/launch/components/deployments/tabs/deployments-tab.tsx apps/build/src/features/launch/components/oneshot-wizard.tsx apps/build/src/server/bff/launch/routes.test.ts apps/portal/src/server/bff/launch/routes.test.ts packages/deploy/test/launch-routes.test.ts apps/build/src/features/launch/components/deployments/tabs/deployments-tab.test.tsx
git commit -m "feat(aomi-build): gate promote on required secrets (the live console path)"
```

**Constraint:** do NOT `git add -A`. There is uncommitted WIP in `use-project-detail.ts` (both apps) that must stay untouched; stage only the paths above.
