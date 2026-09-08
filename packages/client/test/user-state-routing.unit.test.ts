import { describe, expect, it, vi } from "vitest";
import { AomiClient, Session, UserState } from "../src";
import type {
  AomiAccountProfile,
  AomiChainKind,
  AomiSigningPolicy,
} from "../src";
import { buildCliUserState } from "../src/cli/user-state";
import { buildCliConfig } from "../src/cli/commands/defs/shared";

function profile(
  chain: AomiChainKind,
  mode: AomiSigningPolicy["mode"],
): AomiAccountProfile {
  const address = { chain, address: chain === "evm" ? "0xAlice" : "SoLana" };
  return {
    user: {
      user_id: "alice",
      username: null,
      apps: [],
      tier: "free",
      verified_email: null,
      status: "active",
      last_seen_at: null,
      created_at: 0,
      updated_at: 0,
    },
    auth_providers: [],
    user_accounts: [
      {
        address,
        auth_provider: "para",
        is_primary: true,
        provider_managed: true,
      },
    ],
    signing_policies: [
      {
        address,
        mode,
        authorization_version: 1,
        last_authorized_at: null,
        last_authorized_by: null,
      },
    ],
    delegated_accounts: [
      {
        id: 1,
        address,
        delegation_provider: "para",
        status: "active",
        kind: "agent_delegation",
        created_at: 0,
        updated_at: 0,
        expires_at: null,
        revoked_at: null,
        revocation_reason: null,
      },
    ],
    operating_accounts: [],
    onchain_policy_bindings: [],
  };
}

describe("preparation route selection", () => {
  it("lets CLI Auto select a Solana account without its private key", () => {
    const address = "11111111111111111111111111111111";
    expect(buildCliConfig({ "solana-public-key": address }).svmPublicKey).toBe(
      address,
    );
    expect(() => buildCliConfig({ "solana-public-key": "invalid" })).toThrow();
  });
  it("replays an uncertain start unchanged even if settings change before retry", async () => {
    const client = new AomiClient({
      baseUrl: "https://example.test",
      getAccountBearer: async () => "fixture",
      guest: false,
    });
    const lookup = vi
      .spyOn(client, "fetchAccountProfile")
      .mockResolvedValue(profile("evm", "auto"));
    const start = vi
      .spyOn(client.agent, "start")
      .mockRejectedValueOnce(new Error("connection lost after send"))
      .mockResolvedValue({
        session_id: "test",
        events: [],
        cursor: "1",
        has_more: false,
      });
    let state = buildCliUserState("0xAlice", 1);
    const session = new Session(client, {
      sessionId: "test",
      getUserState: () => state,
    });
    try {
      await expect(session.sendAsync("prepare")).rejects.toThrow(
        "connection lost",
      );
      state = buildCliUserState("0xDifferent", 8453);
      await session.sendAsync("prepare");
      expect(start.mock.calls[1]).toEqual(start.mock.calls[0]);
      expect(lookup).toHaveBeenCalledTimes(1);
    } finally {
      session.close();
    }
  });
  it.each(["evm", "svm"] as const)(
    "keeps signing independent of all three %s submitters",
    (chain) => {
      for (const broadcaster of ["wallet", "hosted", "venue"] as const) {
        const state = {
          [chain]: {
            address: profile(chain, "manual").user_accounts[0].address.address,
            broadcaster,
          },
        };
        expect(UserState.route(state, profile(chain, "manual"))).toEqual(state);
        if (broadcaster === "wallet") {
          expect(() => UserState.route(state, profile(chain, "auto"))).toThrow(
            "Auto cannot use",
          );
        } else {
          expect(UserState.route(state, profile(chain, "auto"))).toEqual(state);
        }
      }
    },
  );

  it("UI and CLI choose Hosted for Auto without changing the exact account", () => {
    const ui: UserState = { evm: { address: "0xALICE", chain_id: 8453 } };
    const cli = buildCliUserState("0xALICE", 8453);
    for (const state of [ui, cli]) {
      expect(UserState.route(state, profile("evm", "auto")).evm).toEqual({
        address: "0xALICE",
        chain_id: 8453,
        broadcaster: "hosted",
      });
      expect(state.evm?.broadcaster).toBeUndefined();
    }
  });

  it("never substitutes an agent for the connected login wallet", () => {
    const state = { evm: { address: "0xLogin" } };
    expect(UserState.route(state, profile("evm", "auto"))).toEqual(state);
  });

  it("rejects missing, revoked, expired, wrong-provider and case-mismatched SVM delegations", () => {
    const state = { svm: { address: "SoLana" } };
    const cases = [
      { status: "revoked" as const },
      { revoked_at: 1 },
      { expires_at: 1 },
      { delegation_provider: "privy" },
      { address: { chain: "svm" as const, address: "solana" } },
    ];
    for (const change of cases) {
      const account = profile("svm", "auto");
      Object.assign(account.delegated_accounts[0], change);
      expect(() => UserState.route(state, account)).toThrow("exact wallet");
    }
    const account = profile("svm", "auto");
    account.delegated_accounts = [];
    expect(() => UserState.route(state, account)).toThrow("exact wallet");
    expect(() => UserState.route(state, profile("svm", "denied"))).toThrow(
      "locked",
    );
  });

  it("refreshes policy at the actual session send boundary and never submits after revocation", async () => {
    const client = new AomiClient({
      baseUrl: "https://example.test",
      getAccountBearer: async () => "fixture",
      guest: false,
    });
    const lookup = vi
      .spyOn(client, "fetchAccountProfile")
      .mockResolvedValue(profile("evm", "auto"));
    const start = vi
      .spyOn(client.agent, "start")
      .mockResolvedValue({
        session_id: "test",
        events: [],
        cursor: "1",
        has_more: false,
      });
    const session = new Session(client, {
      sessionId: "test",
      getUserState: () => buildCliUserState("0xAlice", 1),
    });
    try {
      await session.sendAsync("prepare");
      session.stopPolling();
      expect(start.mock.calls[0][0].userState?.evm?.broadcaster).toBe("hosted");
      const revoked = profile("evm", "auto");
      revoked.delegated_accounts = [];
      lookup.mockResolvedValue(revoked);
      await expect(session.sendAsync("prepare again")).rejects.toThrow(
        "exact wallet",
      );
      expect(start).toHaveBeenCalledTimes(1);
      expect(session.actions.pending()).toEqual([]);
    } finally {
      session.close();
    }
  });
});
