import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";
import type { AomiAuthIdentity, AomiListWalletsResponse } from "../../types";

type LoginWalletFamily = "evm" | "solana";

/**
 * The CLI's blue→yellow step: after auth, fetch the account's operable wallets
 * and persist the primary's address(es) as the operating wallet, so the
 * backend-signed (delegated) address reaches `UserState` without the CLI
 * holding a key. Best-effort and gap-filling — it never clobbers a local
 * self-custody key, and a `/wallets` hiccup is non-fatal.
 */
async function hydratePrimaryWallets(
  cli: CliSession,
  client: { listWallets(sessionId: string): Promise<AomiListWalletsResponse> },
  sessionId: string,
): Promise<void> {
  if (cli.publicKey && cli.svmPublicKey) {
    return;
  }
  let wallets: AomiListWalletsResponse["wallets"];
  try {
    ({ wallets } = await client.listWallets(sessionId));
  } catch {
    return;
  }
  const pick = (family: "evm" | "svm") =>
    wallets.find(
      (wallet) => wallet.chain_type === family && wallet.is_primary,
    ) ?? wallets.find((wallet) => wallet.chain_type === family);
  cli.hydrateOperatingWallet({
    evm: pick("evm")?.address,
    svm: pick("svm")?.address,
  });
}

/**
 * `aomi login --provider privy` — mint a backend-owned Privy auth URL for the
 * active session and print it so the user can complete browser login out of
 * band. The browser flow links the provider credential into the account and
 * mints the delegated grant; if the session is not bound to an account yet,
 * the backend resolves/creates one.
 */
export async function walletLoginCommand(
  config: CliConfig,
  options?: { walletFamily?: LoginWalletFamily },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);

  const session = cli.createClientSession(config);
  try {
    const begin = await session.client.beginPrivyAuth(cli.sessionId, {
      application: cli.app,
      walletFamily: options?.walletFamily,
    });
    console.log("Open this URL to authenticate with Privy:");
    console.log(begin.auth_url);
    console.log(
      "After the browser flow completes, run `aomi account` or `aomi wallet ls`.",
    );
    printDataFileLocation();
  } finally {
    session.close();
  }
}

type DeviceStartResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_at: number;
  interval: number;
};

type DevicePollResponse =
  | {
      status: "ok";
      credential: string;
      expires_at: number;
      user_id: string;
    }
  | {
      status: "authorization_pending";
      interval?: number;
    }
  | {
      status: "expired_token" | "access_denied";
    };

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      payload.error
        ? `HTTP ${response.status}: ${payload.error}`
        : `HTTP ${response.status}`,
    );
  }
  return payload;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const baseUrl = cli.baseUrl;

  const started = await postJson<DeviceStartResponse>(
    joinUrl(baseUrl, "/api/cli/device/start"),
    {},
  );

  console.log("Open this URL to authenticate your Aomi CLI:");
  console.log(started.verification_uri);
  console.log(`Code: ${started.user_code}`);

  let intervalMs = Math.max(started.interval, 1) * 1000;
  while (Math.floor(Date.now() / 1000) < started.expires_at) {
    await sleep(intervalMs);
    const response = await fetch(joinUrl(baseUrl, "/api/cli/device/poll"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: started.device_code }),
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as DevicePollResponse;

    if (response.status === 428 && payload.status === "authorization_pending") {
      intervalMs = Math.max(payload.interval ?? started.interval, 1) * 1000;
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Device login failed: ${payload.status ?? response.status}`,
      );
    }
    if (payload.status === "ok") {
      cli.setAccountBearer(payload.credential);
      console.log(`Account: ${payload.user_id}`);
      console.log(
        `CLI credential expires at ${new Date(payload.expires_at * 1000).toISOString()}.`,
      );
      const session = cli.createClientSession(config);
      try {
        await hydratePrimaryWallets(cli, session.client, cli.sessionId);
      } finally {
        session.close();
      }
      printDataFileLocation();
      return;
    }
  }

  throw new Error("Device login expired before approval.");
}

/**
 * `aomi account` (bare) — the canonical account view: user info followed by
 * the linked auth providers table (the profile's `auth_identities`). Resolves
 * the binding via the account bearer (or persisted credential), so it doubles
 * as a "is my session authenticated / bound to a user" check. The wallets
 * (keys) live under `aomi wallet ls`.
 */
export async function accountShowCommand(config: CliConfig): Promise<void> {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);

  const state = cli.toState();
  const hasCredential = Boolean(state.accountBearer);

  const session = cli.createClientSession(config);
  try {
    const profile = await session.client.fetchAccountProfile(cli.sessionId);
    if (!profile) {
      console.log("Not bound to an account (anonymous session).");
      if (!hasCredential) {
        console.log(
          "No account credential configured. Run `aomi login`, pass " +
            "--account-bearer, or complete account auth through the portal.",
        );
      } else {
        console.log(
          "An account credential was sent, but the backend did not bind or accept this session.",
        );
      }
      printDataFileLocation();
      return;
    }

    const user = profile.user;
    console.log(`Account:  ${user.user_id}`);
    if (user.username) console.log(`Username: ${user.username}`);
    if (user.verified_email) {
      console.log(`Email:    ${user.verified_email}`);
    }
    if (user.tier) console.log(`Tier:     ${user.tier}`);
    if (user.status) console.log(`Status:   ${user.status}`);

    printAuthIdentities(profile.auth_identities ?? []);

    // Browser-based provider login completes out of band, so this view is
    // where the CLI first sees the connected wallet — hydrate the operating
    // address here too (no-op once a wallet is already set).
    await hydratePrimaryWallets(cli, session.client, cli.sessionId);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

/**
 * Render the linked-providers table (`auth_identities`). The profile carries
 * no separate subject/handle field, so `auth_method` stands in for it.
 */
function printAuthIdentities(identities: AomiAuthIdentity[]): void {
  console.log(`Providers: ${identities.length}`);
  if (identities.length === 0) return;

  const headers = ["provider", "method", "verified", "primary"];
  const rows = identities.map((identity) => [
    identity.wallet_provider,
    identity.auth_method,
    identity.auth_verified_at ? "✓" : "✗",
    identity.is_primary ? "✓" : "",
  ]);
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => row[i].length)),
  );
  console.log(
    headers
      .map((header, i) => header.padEnd(widths[i]))
      .join("  ")
      .trimEnd(),
  );
  for (const row of rows) {
    console.log(
      row
        .map((cell, i) => cell.padEnd(widths[i]))
        .join("  ")
        .trimEnd(),
    );
  }
}

/**
 * `aomi logout` (bare) — clear the locally stored account credential (the
 * bearer minted by the device flow, plus any legacy provider-exchange
 * config). Local-only: the backend-side credential simply expires.
 */
export function logoutCommand(): void {
  const cli = CliSession.load();
  if (!cli) {
    console.log("Not logged in (no local CLI state).");
    return;
  }
  const state = cli.toState();
  const hadCredential = Boolean(
    state.accountBearer || state.accountProvider || state.accountProviderToken,
  );
  if (!hadCredential) {
    console.log("Not logged in — no stored account credential.");
    printDataFileLocation();
    return;
  }
  cli.clearAccountCredentials();
  console.log("Logged out — cleared the stored account credential.");
  printDataFileLocation();
}

// TODO(backend): needs a revoke endpoint. The approvals endpoints were
// removed, so delegated-grant revocation has no REST surface yet — wire this
// up once the account-authorization endpoints land.
export function providerLogoutCommand(provider: string): never {
  fatal(
    `Provider disconnect ("${provider}") is not yet available from the CLI — ` +
      "coming with the account-authorization endpoints.",
  );
}
