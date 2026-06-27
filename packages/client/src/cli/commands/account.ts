import { CliSession } from "../cli-session";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

type LoginWalletFamily = "evm" | "solana";

/**
 * Mint a backend-owned Privy auth URL for the active session and print it so
 * the user can complete browser login out of band.
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
    console.log("After the browser flow completes, run `aomi wallet whoami`.");
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
      cli.setAccountAccessToken(payload.credential);
      console.log(`Account: ${payload.user_id}`);
      console.log(
        `CLI credential expires at ${new Date(payload.expires_at * 1000).toISOString()}.`,
      );
      printDataFileLocation();
      return;
    }
  }

  throw new Error("Device login expired before approval.");
}

/**
 * Show the account the active session is bound to on the backend. Resolves the
 * binding via the account bearer (or persisted credential), so it doubles as a
 * "is my session authenticated / bound to a user" check.
 */
export async function whoamiCommand(config: CliConfig): Promise<void> {
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
          "No account credential configured. Pass --account-bearer, or " +
            "complete account auth through the portal.",
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
    const wallets = profile.identity_wallets ?? [];
    console.log(`Wallets:  ${wallets.length}`);
    for (const wallet of wallets) {
      const walletId = wallet.wallet_id ? ` (${wallet.wallet_id})` : "";
      console.log(
        `- ${formatWalletChainType(wallet.chain_type)} [${wallet.wallet_provider}]: ${wallet.address}${walletId}`,
      );
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

function formatWalletChainType(chainType: string): string {
  const normalized = chainType.trim().toLowerCase();
  if (normalized === "ethereum" || normalized === "evm") {
    return "Ethereum";
  }
  if (normalized === "solana" || normalized === "svm") {
    return "Solana";
  }
  return chainType;
}
