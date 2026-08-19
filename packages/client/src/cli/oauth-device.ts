import { setTimeout as delay } from "node:timers/promises";

import { joinUrl, normalizeBaseUrl } from "./auth";
import type { CliAuthSession } from "./state";

export type OAuthDeviceLoginOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  openBrowser?: (url: string) => void | Promise<void>;
  now?: () => number;
  wait?: (milliseconds: number) => Promise<unknown>;
  timeoutMs?: number;
};

export async function signInWithOAuthDevice({
  baseUrl,
  fetch: fetchImpl = fetch,
  openBrowser = openUrlInBrowser,
  now = Date.now,
  wait = (milliseconds) => delay(milliseconds),
  timeoutMs = 15 * 60 * 1_000,
}: OAuthDeviceLoginOptions): Promise<{ auth: CliAuthSession }> {
  const portalUrl = normalizeBaseUrl(baseUrl);
  const registration = await json(
    await fetchImpl(joinUrl(portalUrl, "/api/auth/oauth2/register"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientName: "Aomi CLI",
        redirectUris: ["http://127.0.0.1/callback"],
      }),
    }),
    "OAuth client registration",
  );
  const clientId = text(registration.clientId);
  if (!clientId) throw new Error("OAuth registration is missing clientId");

  const resource = `${new URL(portalUrl).origin}/v1/agent`;
  const challenge = await json(
    await fetchImpl(joinUrl(portalUrl, "/api/auth/oauth2/device/code"), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "agent profile offline_access",
        resource,
      }),
    }),
    "OAuth device authorization",
  );
  const deviceCode = text(challenge.device_code);
  const verification =
    text(challenge.verification_uri_complete) ??
    text(challenge.verification_uri);
  const interval = Math.max(Number(challenge.interval ?? 5), 1) * 1_000;
  if (!deviceCode || !verification) {
    throw new Error("OAuth device authorization response is incomplete");
  }
  await openBrowser(verification);

  const deadline = now() + timeoutMs;
  let pollInterval = interval;
  while (now() < deadline) {
    await wait(pollInterval);
    const response = await fetchImpl(
      joinUrl(portalUrl, "/api/auth/oauth2/token"),
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: clientId,
        }),
      },
    );
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (response.ok) {
      const accessToken = text(body.access_token);
      if (!accessToken?.startsWith("aomi_at_")) {
        throw new Error("OAuth token response is missing an Aomi access token");
      }
      return {
        auth: {
          sessionToken: accessToken,
          expiresAt: now() + Number(body.expires_in ?? 3600) * 1_000,
          oauthRefreshToken: text(body.refresh_token),
          oauthClientId: clientId,
        },
      };
    }
    if (body.error === "slow_down") {
      pollInterval += 5_000;
      continue;
    }
    if (body.error !== "authorization_pending") {
      throw new Error(
        `OAuth device authorization failed: ${text(body.error) ?? response.status}`,
      );
    }
  }
  throw new Error("Timed out waiting for OAuth device authorization");
}

async function json(
  response: Response,
  operation: string,
): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new Error(
      `${operation} failed: ${text(body.error) ?? response.status}`,
    );
  }
  return body;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

async function openUrlInBrowser(url: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}
