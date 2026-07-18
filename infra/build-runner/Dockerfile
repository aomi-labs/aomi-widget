# Golden image for /build sandbox runners (ship plan Phase 3).
#
# One sandbox per build run boots from this image and executes
#   bun packages/smither/dist/cli.js run-plan --plan-b64 … --run-id …
# writing all run state to the shared Postgres (SMITHER_DATABASE_URL).
#
# Everything slow is baked here so runs start in seconds: Rust toolchain,
# Bun + Node, the claude CLI, a pinned aomi-sdk checkout with prebuilt
# aomi-build/aomi-run release binaries and warm cargo caches, and the built
# @aomi-labs/smither package with its node_modules.
#
# Build (see README.md for the VCR push flow):
#   docker build -t build-runner \
#     --build-arg AOMI_SDK_REF=<released sha> \
#     --build-arg AOMI_REF=<aomi repo sha> \
#     --secret id=gh_token,env=GH_TOKEN \
#     infra/build-runner
#
# Runtime env injected per sandbox by the BFF (never baked):
#   SMITHER_DATABASE_URL, AOMI_BUILDER_API_KEY, AOMI_ALLOW_STALE_SDK=1

# Sandbox custom images are plain OCI images (linux/amd64) — no base-OS
# requirement, so use Debian slim for smaller layers and apt tooling.
FROM debian:bookworm-slim

ARG AOMI_SDK_REF=main
ARG AOMI_REF=main
ARG RUST_VERSION=1.88.0
ARG NODE_VERSION=24
ARG BUN_VERSION=1.3.5

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      git build-essential libssl-dev pkg-config \
      curl ca-certificates tar gzip unzip \
    && rm -rf /var/lib/apt/lists/*

# Node (claude CLI host) + Bun (run-plan runtime).
RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm @anthropic-ai/claude-code \
    && curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v${BUN_VERSION}"

# Rust toolchain.
RUN curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs \
      | sh -s -- -y --default-toolchain "${RUST_VERSION}" --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /workspace

# Pinned aomi-sdk checkout with prebuilt release binaries + warm caches.
# The gh_token secret is only needed while the repos are private.
RUN --mount=type=secret,id=gh_token \
    GH_TOKEN=$(cat /run/secrets/gh_token 2>/dev/null || true); \
    git clone "https://${GH_TOKEN:+${GH_TOKEN}@}github.com/aomi-labs/aomi-sdk.git" aomi-sdk \
    && git -C aomi-sdk checkout "${AOMI_SDK_REF}" \
    && cargo build --release --manifest-path aomi-sdk/Cargo.toml \
         -p aomi-sdk --features cli,dev-runtime --bin aomi-build --bin aomi-run

# The aomi repo for @aomi-labs/smither (run-plan lives in its dist).
RUN --mount=type=secret,id=gh_token \
    GH_TOKEN=$(cat /run/secrets/gh_token 2>/dev/null || true); \
    git clone "https://${GH_TOKEN:+${GH_TOKEN}@}github.com/aomi-labs/aomi.git" aomi \
    && git -C aomi checkout "${AOMI_REF}" \
    && cd aomi \
    && pnpm install --frozen-lockfile \
    && pnpm --filter "@aomi-labs/smither..." build

# Sanity: the runner entry parses, actually ships the run-plan subcommand
# (the CLI exits 0 on unknown subcommands, so grep the bundle — an image
# built from a ref without run-plan must fail here, not at dispatch), and
# the binaries exist.
RUN bun /workspace/aomi/packages/smither/dist/cli.js run-plan --help >/dev/null \
    && grep -q "run-plan" /workspace/aomi/packages/smither/dist/cli.js \
    && test -x /workspace/aomi-sdk/target/release/aomi-build \
    && test -x /workspace/aomi-sdk/target/release/aomi-run

ENV AOMI_SDK_ROOT=/workspace/aomi-sdk
WORKDIR /workspace/aomi/packages/smither
