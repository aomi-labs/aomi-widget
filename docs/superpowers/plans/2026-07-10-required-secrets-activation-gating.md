# Required-Secret Activation Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect the secrets an Aomi app declares and force the builder to fill every required one before the app can be activated.

**Architecture:** `aomi-build compile` already `dlopen`s each built plugin and reads its `DynManifest` (which carries `secrets: [{name, description, required}]`) purely to validate it, then throws it away. We persist that data into the release's `manifest.json`. Aomi Build's BFF then fetches that release asset from GitHub (using the token it already holds), diffs the required slots against the vault's configured key names, disables the Activate button until the set is empty, and re-checks server-side with a 409.

**Tech Stack:** Rust (`aomi-sdk`: clap, serde, libloading), TypeScript (`packages/deploy`, Next.js App Router BFF, React), vitest, cargo test.

## Global Constraints

- Two repos: `/Users/han/github/aomi-sdk` and `/Users/han/github/aomi-widget`. No backend (`product-mono`) change.
- Secret **values** are never read back. The vault returns key names only. Never render or log a value.
- Slot shape is fixed by the SDK: `{ name: string, description: string, required: bool }`.
- Vault handles are `$SECRET:APP:<app>::<KEY>`; display strips to `<KEY>`.
- Env-var names are case-sensitive. Do **not** case-fold when matching slot names to configured keys.
- An app that declares no slots must activate exactly as it does today (no gate, no behaviour change).
- The `activate` BFF route exists in **three** copies and all three must stay in sync:
  `apps/aomi-build/src/server/bff/launch/routes.ts`, `apps/portal/src/server/bff/launch/routes.ts`, `packages/deploy/src/bff/launch-routes.ts`.
- Commit after every task. Never mark a task done with failing tests.

---

## File Structure

**`aomi-sdk`:**
- Modify `sdk/bin/build/compile/validate.rs` — expose the manifest it already reads.
- Create `sdk/bin/build/compile/release_manifest.rs` — build + serialize `manifest.json`.
- Modify `sdk/bin/build/compile/mod.rs` — collect manifests, write the file, accept `--release-tag` / `--commit`.
- Modify `.github/workflows/release-plugins.yml` — drop the inline Python step.

**`aomi-widget`:**
- Modify `packages/deploy/src/types.ts` — `SecretSlot`, `ReleaseManifest`.
- Create `packages/deploy/src/secrets.ts` — `missingRequiredSecrets` (pure).
- Create `packages/deploy/src/bff/release-manifest.ts` — fetch + parse the GitHub release asset.
- Modify the three `launch` route files — 409 backstop.
- Create `apps/aomi-build/src/app/api/bff/deployments/required-secrets/route.ts` + handler.
- Modify `apps/aomi-build/.../tabs/environment-tab.tsx`, `deploy-step.tsx`, `deploy-dashboard.tsx` — the gate.

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

## Task 2: Build and write `manifest.json` from `compile` (aomi-sdk)

**Files:**
- Create: `/Users/han/github/aomi-sdk/sdk/bin/build/compile/release_manifest.rs`
- Modify: `/Users/han/github/aomi-sdk/sdk/bin/build/compile/mod.rs`

**Interfaces:**
- Consumes: `inspect_plugin` (Task 1).
- Produces: `pub struct ReleaseManifest`, `pub fn build_release_manifest(entries: &[PluginEntry], app_release_tag: &str, commit: &str, target: &str) -> ReleaseManifest`, and `pub struct PluginEntry { pub name: String, pub file: String, pub sha256: String, pub secrets: Vec<SecretSlot> }`.

The emitted JSON keeps the existing top-level shape so nothing downstream breaks, and adds `secrets` per plugin:

```json
{
  "app_release_tag": "v0.4.1",
  "sdk_version": "0.4.1",
  "target": "aarch64-apple-darwin",
  "commit": "abc123",
  "plugins": {
    "binance": {
      "file": "libbinance.dylib",
      "sha256": "…",
      "secrets": [
        { "name": "BINANCE_API_KEY", "description": "Binance dashboard API key…", "required": true }
      ]
    }
  }
}
```

- [ ] **Step 1: Write the failing test**

Create `sdk/bin/build/compile/release_manifest.rs`:

```rust
//! Build the release `manifest.json` from the plugin manifests that
//! `compile` already reads during validation.

use aomi_sdk::SecretSlot;
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize)]
pub struct PluginEntry {
    pub file: String,
    pub sha256: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub secrets: Vec<SecretSlot>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReleaseManifest {
    pub app_release_tag: String,
    pub sdk_version: String,
    pub target: String,
    pub commit: String,
    pub plugins: BTreeMap<String, PluginEntry>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn slot(name: &str, required: bool) -> SecretSlot {
        SecretSlot {
            name: name.to_string(),
            description: "d".to_string(),
            required,
        }
    }

    #[test]
    fn serializes_secrets_per_plugin() {
        let mut plugins = BTreeMap::new();
        plugins.insert(
            "binance".to_string(),
            PluginEntry {
                file: "libbinance.dylib".to_string(),
                sha256: "deadbeef".to_string(),
                secrets: vec![slot("BINANCE_API_KEY", true)],
            },
        );
        let manifest = ReleaseManifest {
            app_release_tag: "v0.4.1".to_string(),
            sdk_version: "0.4.1".to_string(),
            target: "aarch64-apple-darwin".to_string(),
            commit: "abc123".to_string(),
            plugins,
        };

        let json = serde_json::to_value(&manifest).expect("serialize");
        assert_eq!(json["plugins"]["binance"]["sha256"], "deadbeef");
        assert_eq!(
            json["plugins"]["binance"]["secrets"][0]["name"],
            "BINANCE_API_KEY"
        );
        assert_eq!(json["plugins"]["binance"]["secrets"][0]["required"], true);
    }

    #[test]
    fn omits_secrets_when_the_plugin_declares_none() {
        let mut plugins = BTreeMap::new();
        plugins.insert(
            "hello".to_string(),
            PluginEntry {
                file: "libhello.dylib".to_string(),
                sha256: "cafe".to_string(),
                secrets: vec![],
            },
        );
        let manifest = ReleaseManifest {
            app_release_tag: "v1".to_string(),
            sdk_version: "1".to_string(),
            target: "t".to_string(),
            commit: "c".to_string(),
            plugins,
        };
        let json = serde_json::to_value(&manifest).expect("serialize");
        assert!(json["plugins"]["hello"].get("secrets").is_none());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/han/github/aomi-sdk && cargo test -p aomi-sdk --features cli --bin aomi-build release_manifest`
Expected: FAIL — module `release_manifest` not declared in `compile/mod.rs`.

- [ ] **Step 3: Write minimal implementation**

Add to the top of `sdk/bin/build/compile/mod.rs`:

```rust
mod release_manifest;
use release_manifest::{PluginEntry, ReleaseManifest};
```

Ensure `SecretSlot` derives `Serialize` in `sdk/src/secrets.rs` (it already derives `Deserialize`; add `Serialize` if missing).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/han/github/aomi-sdk && cargo test -p aomi-sdk --features cli --bin aomi-build release_manifest`
Expected: PASS (2 passed).

- [ ] **Step 5: Wire it into `compile` and add the CLI args**

In `sdk/bin/build/compile/mod.rs`, add to `CompileArgs`:

```rust
    /// Release tag written into `plugins/manifest.json` (CI supplies this).
    #[arg(long)]
    pub release_tag: Option<String>,

    /// Commit SHA written into `plugins/manifest.json` (CI supplies this).
    #[arg(long)]
    pub commit: Option<String>,
```

After the build loop completes (and only when `!plugin_manifests.is_empty()`), write the file:

```rust
    let mut plugins = std::collections::BTreeMap::new();
    for (plugin_name, plugin_manifest) in &plugin_manifests {
        let file = library_file_name(plugin_name, target_triple);
        let bytes = fs::read(plugins_dir.join(&file))
            .unwrap_or_else(|err| panic!("failed to read {file} for hashing: {err}"));
        plugins.insert(
            plugin_manifest.name.clone(),
            PluginEntry {
                file,
                sha256: sha256_hex(&bytes),
                secrets: plugin_manifest.secrets.clone().unwrap_or_default(),
            },
        );
    }

    let manifest = ReleaseManifest {
        app_release_tag: args.release_tag.clone().unwrap_or_default(),
        sdk_version: AOMI_SDK_VERSION.to_string(),
        target: target_triple.unwrap_or(env!("TARGET")).to_string(),
        commit: args.commit.clone().unwrap_or_default(),
        plugins,
    };

    let manifest_path = plugins_dir.join("manifest.json");
    let json = serde_json::to_string_pretty(&manifest).expect("serialize release manifest");
    fs::write(&manifest_path, format!("{json}\n"))
        .unwrap_or_else(|err| panic!("failed to write {}: {err}", manifest_path.display()));
    println!("wrote {}", manifest_path.display());
```

Add a `sha256_hex` helper in `release_manifest.rs` (add `sha2 = "0.10"` to `sdk/Cargo.toml` if absent):

```rust
pub fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().iter().map(|b| format!("{b:02x}")).collect()
}
```

- [ ] **Step 6: Verify end-to-end locally**

Run: `cd /Users/han/github/aomi-sdk && cargo run -p aomi-sdk --features cli --bin aomi-build -- compile --release-tag v0.0.0-test --commit local`
Expected: `wrote .../plugins/manifest.json`.

Run: `python3 -c "import json;m=json.load(open('plugins/manifest.json'));print(json.dumps(m['plugins'].get('binance',{}),indent=2))"`
Expected: a `secrets` array containing `BINANCE_API_KEY` and `BINANCE_SECRET_KEY` with `required: true`.

- [ ] **Step 7: Commit**

```bash
cd /Users/han/github/aomi-sdk
git add sdk/bin/build/compile/ sdk/Cargo.toml sdk/src/secrets.rs
git commit -m "feat(compile): emit manifest.json with declared secret slots

compile already dlopens every plugin and reads its DynManifest. Persist the
declared secrets into the release manifest so deploy tooling can gate
activation on required slots being filled."
```

---

## Task 3: Drop the inline Python step from CI (aomi-sdk)

The Python step registers *every* file in `plugins/` as a plugin (`plugins[path.stem]`), so any stray file becomes a bogus entry. `compile` now writes the file authoritatively.

**Files:**
- Modify: `/Users/han/github/aomi-sdk/.github/workflows/release-plugins.yml:83-118`

- [ ] **Step 1: Replace the two steps**

Replace the `Build all plugins` and `Generate manifest.json` steps with a single step:

```yaml
      - name: Build all plugins
        run: |
          cargo run -p aomi-sdk --features cli --bin aomi-build -- compile \
            --release --target ${{ matrix.target }} \
            --release-tag ${{ needs.resolve.outputs.tag }} \
            --commit ${{ github.sha }}

      - name: Show manifest
        run: cat plugins/manifest.json
```

- [ ] **Step 2: Verify the tarball still contains manifest.json**

The next step is `tar czf … plugins/`, which now includes the `compile`-written `manifest.json`. No change needed. Confirm by reading the workflow that `Create tarball` still runs after the build step.

- [ ] **Step 3: Commit**

```bash
cd /Users/han/github/aomi-sdk
git add .github/workflows/release-plugins.yml
git commit -m "ci: let aomi-build compile own manifest.json

Removes the inline Python step, which treated every file in plugins/ as a
plugin. compile knows exactly which libraries it built and validated."
```

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
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/server/bff/launch/routes.ts` (`activateLaunchRoute`)
- Modify: `/Users/han/github/aomi-widget/apps/portal/src/server/bff/launch/routes.ts` (`activateLaunchRoute`)
- Modify: `/Users/han/github/aomi-widget/packages/deploy/src/bff/launch-routes.ts` (`activate`)
- Test: the matching `routes.test.ts` in each app, and `packages/deploy/test/launch-routes.test.ts`

**Interfaces:**
- Consumes: `fetchReleaseSecretSlots` (Task 5), `missingRequiredSecrets` (Task 4), `listAppSecrets` (existing, `client.ts:911`).
- Produces: on unfilled required slots, HTTP **409** with body `{ error: "missing required secrets", missing: Record<appName, string[]> }`.

- [ ] **Step 1: Write the failing test (aomi-build copy)**

Add to `apps/aomi-build/src/server/bff/launch/routes.test.ts`, inside the `activateLaunchRoute` describe block:

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

In each `activateLaunchRoute`, immediately **after** the `authorized` pair check and **before** `client.activate`:

```ts
    const missingByApp = await missingSecretsForActivation(
      client,
      session.githubUserId,
      config,
      source,
      pairs,
    );
    if (Object.keys(missingByApp).length > 0) {
      return NextResponse.json(
        { error: "missing required secrets", missing: missingByApp },
        { status: 409 },
      );
    }
```

Add the helper next to `activationPairsBelongToSource` in the same file:

```ts
/**
 * Required slots the app declares (from the release's manifest.json) that have
 * no value in the vault yet, keyed by app name. Empty object = safe to activate.
 */
async function missingSecretsForActivation(
  client: DeploymentClientInstance,
  githubUserId: string,
  config: ReturnType<typeof launchConfig>,
  source: OwnedSource,
  pairs: ActivationPair[],
): Promise<Record<string, string[]>> {
  const githubToken = process.env.GITHUB_TOKEN?.trim();
  const platformRepo = source.latestDeployment?.platformRepo;
  if (!githubToken || !platformRepo) return {};

  const configured = await client.listAppSecrets({
    githubUserId,
    platform: config.platform,
    sourceId: source.id,
  });

  const missing: Record<string, string[]> = {};
  for (const pair of pairs) {
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

Import at the top of each file:

```ts
import { fetchReleaseSecretSlots } from "@aomi-labs/deploy/bff";
import { missingRequiredSecrets } from "@aomi-labs/deploy";
```

In `packages/deploy/src/bff/launch-routes.ts` use the local imports (`./release-manifest`, `../secrets`), the injected `getSession(req)` session, and `jsonResponse({...}, 409)` instead of `NextResponse.json`.

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
git add apps/aomi-build/src/server/bff/launch/routes.ts apps/portal/src/server/bff/launch/routes.ts packages/deploy/src/bff/launch-routes.ts apps/aomi-build/src/server/bff/launch/routes.test.ts apps/portal/src/server/bff/launch/routes.test.ts packages/deploy/test/launch-routes.test.ts
git commit -m "feat(bff): 409 activate when required secrets are unfilled

Applied to all three copies of the activate route so the portal and the
package BFF inherit the backstop."
```

---

## Task 7: `required-secrets` BFF route (aomi-build)

The UI needs the slots + missing set for the project page and wizard.

**Files:**
- Create: `/Users/han/github/aomi-widget/apps/aomi-build/src/app/api/bff/deployments/required-secrets/route.ts`
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/server/bff/launch/routes.ts` (add `requiredSecretsRoute`)
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/lib/api-paths.ts`
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/launch/client.ts`
- Test: `apps/aomi-build/src/server/bff/launch/routes.test.ts`

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

Add to `apps/aomi-build/src/server/bff/launch/routes.ts`:

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

Create `apps/aomi-build/src/app/api/bff/deployments/required-secrets/route.ts`:

```ts
import { requiredSecretsRoute } from "@build/server/bff/launch/routes";

export const GET = requiredSecretsRoute;
```

Add to `apps/aomi-build/src/lib/api-paths.ts` under `bff.deployments`:

```ts
      requiredSecrets: (appSourceId: number) =>
        `${BFF}/deployments/required-secrets?appSourceId=${appSourceId}`,
```

Add to `apps/aomi-build/src/features/launch/client.ts`:

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
git add apps/aomi-build/src/app/api/bff/deployments/required-secrets apps/aomi-build/src/server/bff/launch/routes.ts apps/aomi-build/src/lib/api-paths.ts apps/aomi-build/src/features/launch/client.ts apps/aomi-build/src/server/bff/launch/routes.test.ts
git commit -m "feat(aomi-build): required-secrets BFF route"
```

---

## Task 8: Load required secrets into `useProjectDetail`

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/launch/hooks/use-project-detail.ts`
- Test: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/launch/hooks/use-project-detail.test.ts`

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
git add apps/aomi-build/src/features/launch/hooks/use-project-detail.ts apps/aomi-build/src/features/launch/hooks/use-project-detail.test.ts
git commit -m "feat(aomi-build): expose required-secret state from useProjectDetail"
```

---

## Task 9: Prefilled required-secret rows in the Environment tab

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/launch/components/deployments/tabs/environment-tab.tsx`
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
git add apps/aomi-build/src/features/launch/components/deployments/tabs/environment-tab.tsx apps/aomi-build/src/features/launch/components/deployments/tabs/environment-tab.test.tsx
git commit -m "feat(aomi-build): prefill required secret slots in the Environment tab"
```

---

## Task 10: Gate the Activate button in both call sites

**Files:**
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/launch/components/deploy-dashboard.tsx` (`LifecyclePanel`)
- Modify: `/Users/han/github/aomi-widget/apps/aomi-build/src/features/launch/components/deploy-step.tsx` (`DeployStep`)
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
git add apps/aomi-build/src/features/launch/components/
git commit -m "feat(aomi-build): gate Activate on required secrets being filled

Disables Activate in both call sites while any required slot is unfilled and
renders the 409 missing-secret map when the server rejects an activation."
```

---

## Manual verification

1. `cd /Users/han/github/aomi-sdk && cargo run -p aomi-sdk --features cli --bin aomi-build -- compile --release-tag v0-test --commit local`
   → `plugins/manifest.json` contains `binance.secrets` with both keys, `required: true`.
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
