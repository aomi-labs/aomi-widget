// =============================================================================
// BE-vault SecretStore — v1 backend.
// =============================================================================
//
// Posts secrets to the Rust BE's auth-trusted ingest endpoint. The BE keeps
// them in its existing in-process `SecretVault` keyed on the supplied
// user_id; the BE's tool runtime reads them by handle as it does today.
//
// v1 contract:
//
//   POST {beUrl}/api/_internal/secrets
//   Header: X-Aomi-Auth: {authToken}
//   Body:   { user_id, app, secrets: { NAME: value, ... } }
//   Reply:  { handles: { NAME: handle } }
//
// The endpoint is being added on the BE side (separate from the
// session-scoped POST /api/secrets used by FE/CLI today). The static token
// is shared between BE and portal via env.

import type { SecretHandle, UserId } from "../types";
import type { SecretStore } from "./index";

export interface BeVaultConfig {
  beUrl: string;
  authToken: string;
  fetchImpl?: typeof fetch;
}

export class BeVaultSecretStore implements SecretStore {
  private readonly fetch: typeof fetch;

  constructor(private readonly config: BeVaultConfig) {
    this.fetch = config.fetchImpl ?? fetch;
  }

  async put(args: {
    userId: UserId;
    application: string;
    secrets: Record<string, string>;
  }): Promise<Record<string, SecretHandle>> {
    const url = `${this.config.beUrl.replace(/\/$/, "")}/api/_internal/secrets`;
    const res = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aomi-Auth": this.config.authToken,
      },
      body: JSON.stringify({
        user_id: args.userId,
        app: args.application,
        secrets: args.secrets,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `be-vault: POST /api/_internal/secrets ${res.status} ${detail.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as { handles?: Record<string, string> };
    if (!json.handles || typeof json.handles !== "object") {
      throw new Error("be-vault: response missing `handles`");
    }
    return json.handles;
  }
}
