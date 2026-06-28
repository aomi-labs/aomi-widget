# Somm Finance Aomi App Maintenance Guide

This guide is for maintaining the Somm Finance Aomi app on Aomi staging.

## Current Live App

- Platform: `somm.finance`
- Source repo: `https://github.com/PeggyJV/somm-agent`
- Platform release repo: `https://github.com/aomi-labs/somm-finance-apps`
- App source id: `1065`
- GitHub App installation id: `142706501`
- Live app name: `somm-agent`
- Current source commit: `4c0b05beca9669adc9265188c46413535e02c68d`
- Current release tag: `apps-142706501-rade78d3675-somm-agent-4c0b05beca96`
- Current release: `https://github.com/aomi-labs/somm-finance-apps/releases/tag/apps-142706501-rade78d3675-somm-agent-4c0b05beca96`

The app is active and loaded on staging. If it does not appear in the generic Aomi chat app picker yet, that is a picker/catalog issue, not a deployment issue. The staging backend reports:

```json
{
  "name": "somm-agent",
  "is_active": true,
  "is_public": true,
  "loaded": true
}
```

## Staging Access Token

Use this platform-scoped staging activation token for `somm.finance`:

```text
9eec24201c19ec8a3bc2b92a0e6fda0f641e8e406fb292f773c97f55e95aad4d
```

Treat this token like a secret. It authorizes deploy and activation operations for the staging `somm.finance` platform.

## One-Time CLI Setup

Install or update the Aomi CLI so it uses `aomi-sdk 3.0.1` or newer.

Then connect the Somm repo to staging:

```bash
aomi-build connect \
  --backend https://api-staging.aomi.dev \
  --platform somm.finance \
  --repo PeggyJV/somm-agent \
  --installation-id 142706501 \
  --activation-token 9eec24201c19ec8a3bc2b92a0e6fda0f641e8e406fb292f773c97f55e95aad4d \
  --no-browser
```

This stores the token and installation id in your local Aomi CLI config.

## Source Requirements

The source repo must contain `aomi.toml`:

```toml
[app]
name = "somm-agent"
display_name = "Agentic Somm"
platform = "somm.finance"
public = true
```

The app must pin the same SDK version as the staging runtime:

```toml
[dependencies]
aomi-sdk = "=3.0.1"
```

After changing `Cargo.toml`, refresh the lockfile and check the app:

```bash
cargo update -p aomi-sdk --precise 3.0.1
cargo check
```

Commit and push all source changes before deploying. The backend deploys from a GitHub commit SHA, not from local-only edits.

## Deploy A Change

From a clean checkout of `PeggyJV/somm-agent`:

```bash
git checkout main
git pull --ff-only
cargo check
git rev-parse HEAD
```

Deploy the exact commit:

```bash
aomi-build deploy \
  --backend https://api-staging.aomi.dev \
  --platform somm.finance \
  --app-source-id 1065 \
  --commit <SOURCE_COMMIT_SHA> \
  --path .
```

The deploy command stages the source into `aomi-labs/somm-finance-apps`, opens or updates a platform PR, and returns a release tag like:

```text
apps-142706501-rade78d3675-somm-agent-<short_commit>
```

## Watch Build Status

Check the platform PR and GitHub Actions link printed by deploy.

You can also check CLI status:

```bash
aomi-build status \
  --backend https://api-staging.aomi.dev \
  --path .
```

Or list currently loaded platform apps:

```bash
aomi-build apps list \
  --backend https://api-staging.aomi.dev \
  --platform somm.finance
```

Wait until CI passes and the GitHub release exists before activation.

## Activate A Release

Activate the release tag printed by deploy:

```bash
aomi-build activate \
  --backend https://api-staging.aomi.dev \
  --platform somm.finance \
  --release-tag <RELEASE_TAG> \
  --path .
```

Successful activation should report:

```text
ci_status: passed
activation_status: promoted
is_active: true
loaded: true
```

## Access The App

The staging app is loaded in Aomi runtime under:

```text
platform: somm.finance
app: somm-agent
```

Use the staging chat product:

```text
https://chat-staging.aomi.dev
```

Current caveat: the generic chat app picker may not show `somm-agent` yet even when the runtime has loaded it. If the picker does not show the app, verify backend state with:

```bash
aomi-build apps list \
  --backend https://api-staging.aomi.dev \
  --platform somm.finance
```

If that command reports `is_active: true` and `loaded: true`, the deploy is healthy and the remaining issue is chat UI catalog visibility.

## Common Failure Modes

### SDK Version Mismatch

Symptom:

```text
SDK version mismatch
```

Fix:

```bash
cargo update -p aomi-sdk --precise 3.0.1
cargo check
git add Cargo.toml Cargo.lock
git commit -m "Bump aomi-sdk"
git push
```

Then redeploy and activate the new commit.

### Deploy 403

Symptom:

```text
deploy endpoint returned 403 Forbidden
```

Fix: reconnect with the platform token:

```bash
aomi-build connect \
  --backend https://api-staging.aomi.dev \
  --platform somm.finance \
  --repo PeggyJV/somm-agent \
  --installation-id 142706501 \
  --activation-token 9eec24201c19ec8a3bc2b92a0e6fda0f641e8e406fb292f773c97f55e95aad4d \
  --no-browser
```

### CI Pending

Symptom:

```text
CI is pending; activate after Aomi CI passes
```

Fix: wait for the platform release workflow in `aomi-labs/somm-finance-apps` to finish, then retry activation.

### App Not Visible In Picker

Symptom: backend says `loaded: true`, but the chat app picker does not show `somm-agent`.

Fix: this is not an app deploy problem. The chat UI app picker must include active hosted platform apps from `somm.finance`. Use `aomi-build apps list` as the deployment source of truth until that UI path is wired.
