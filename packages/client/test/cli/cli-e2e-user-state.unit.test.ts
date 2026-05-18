// =============================================================================
// CLI UserState — end-to-end shape per tmp.md table
// =============================================================================
// Replicates the rows of `tmp.md` for the CLI paths only. Drives the
// real `ClientSession` + `buildCliUserState` + `session.resolveWallet`
// pipeline (no network — the SSE subscribe is the only client method
// invoked). Each test asserts the exact UserState shape the table claims.
//
// Coverage:
//   Table A (connect-time): CLI no-AA, CLI --aa 4337, CLI --aa 7702
//   Table B (post-tx writes): CLI --aa 4337 tx, CLI --aa 7702 tx
//
// Disconnected / Booting rows are React-runtime concerns (handled in
// packages/react/.../user-context tests) and out of scope here.

import { describe, expect, it } from "vitest";
import { ClientSession } from "../../src/session";
import { AomiClient } from "../../src/client";
import { CLIENT_TYPE_TS_CLI } from "../../src/types";
import { buildCliUserState } from "../../src/cli/user-state";

const EOA = "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const SMART_ACCOUNT_4337 = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const DELEGATION_7702 = "0x69007702764179f14F51cdce752f4f775d74E139";
const CHAIN_ID = 1;

function fakeClient(): AomiClient {
  // ClientSession ctor instance-checks the client and only calls
  // `subscribeSSE` synchronously; resolveWallet / getUserState don't hit
  // the network at all. Real instance + stubbed subscribe satisfies the
  // type guard without leaking any HTTP from these tests.
  const client = new AomiClient({ baseUrl: "http://test.invalid" });
  (client as unknown as { subscribeSSE: AomiClient["subscribeSSE"] }).subscribeSSE =
    () => () => {};
  return client;
}

function makeSession(initialUserState?: ReturnType<typeof buildCliUserState>) {
  return new ClientSession(fakeClient(), {
    sessionId: "test-session",
    clientId: "test-client",
    app: "default",
    publicKey: EOA,
    userState: initialUserState,
    clientType: CLIENT_TYPE_TS_CLI,
  });
}

// ---------------------------------------------------------------------------
// Table A — connect-time
// ---------------------------------------------------------------------------

describe("CLI UserState — Table A connect-time", () => {
  it("CLI no-AA: address + chain + is_connected + ts_cli client_type", () => {
    const session = makeSession(buildCliUserState(EOA, CHAIN_ID));
    const state = session.getUserState();

    expect(state).toEqual({
      address: EOA,
      chain_id: CHAIN_ID,
      is_connected: true,
      ext: { client_type: "ts_cli" },
    });
    // Per Table A: aa_mode and wallet_kind are absent (not "none"/"eoa").
    expect(state).not.toHaveProperty("aa_mode");
    expect(state).not.toHaveProperty("wallet_kind");
    expect(state).not.toHaveProperty("smart_account_4337");
    expect(state).not.toHaveProperty("delegation_7702");

    session.close();
  });

  it("CLI --aa 4337: wallet_kind=eoa, aa_mode=4337", () => {
    const session = makeSession(
      buildCliUserState(EOA, CHAIN_ID, {
        aaMode: "4337",
        smartAccount: SMART_ACCOUNT_4337,
      }),
    );
    const state = session.getUserState();

    expect(state).toMatchObject({
      address: EOA,
      chain_id: CHAIN_ID,
      is_connected: true,
      wallet_kind: "eoa",
      aa_mode: "4337",
      ext: { client_type: "ts_cli" },
    });
    // Connect-time does not yet write the per-tx address fields.
    expect(state).not.toHaveProperty("smart_account_4337");
    expect(state).not.toHaveProperty("delegation_7702");

    session.close();
  });

  it("CLI --aa 7702: wallet_kind=eoa, aa_mode=7702", () => {
    const session = makeSession(
      buildCliUserState(EOA, CHAIN_ID, { aaMode: "7702" }),
    );
    const state = session.getUserState();

    expect(state).toMatchObject({
      address: EOA,
      chain_id: CHAIN_ID,
      is_connected: true,
      wallet_kind: "eoa",
      aa_mode: "7702",
      ext: { client_type: "ts_cli" },
    });
    expect(state).not.toHaveProperty("smart_account_4337");
    expect(state).not.toHaveProperty("delegation_7702");

    session.close();
  });
});

// ---------------------------------------------------------------------------
// Table B — post-tx writes (driven via the actual CLI tx-complete call sequence)
// ---------------------------------------------------------------------------
//
// CLI's wallet.ts post-tx path is:
//   session.resolveWallet(account.address, chainId, {
//     aaMode, smartAccount, smartAccount4337, delegation7702,
//   });
//
// We replay that call directly here. The session reducer is the same code
// the real CLI hits — only the network layer is stubbed.

describe("CLI UserState — Table B post-tx writes", () => {
  it("CLI --aa 4337 tx: writes aa_mode=4337, smart_account_4337=<addr>, delegation_7702=null", () => {
    const session = makeSession(
      buildCliUserState(EOA, CHAIN_ID, {
        aaMode: "4337",
        smartAccount: SMART_ACCOUNT_4337,
      }),
    );

    session.resolveWallet(EOA, CHAIN_ID, {
      aaMode: "4337",
      smartAccount: SMART_ACCOUNT_4337,
      smartAccount4337: SMART_ACCOUNT_4337,
      delegation7702: null,
    });

    expect(session.getUserState()).toMatchObject({
      address: EOA,
      chain_id: CHAIN_ID,
      is_connected: true,
      // CLI EOA address ≠ smart account address ⟹ wallet_kind is "eoa"
      // (not "smart-account"). Matches Table A "CLI --aa 4337" row.
      wallet_kind: "eoa",
      aa_mode: "4337",
      smart_account_4337: SMART_ACCOUNT_4337,
      delegation_7702: null,
      ext: { client_type: "ts_cli" },
    });

    session.close();
  });

  it("CLI --aa 7702 tx: writes aa_mode=7702, delegation_7702=<addr>, smart_account_4337=null", () => {
    const session = makeSession(
      buildCliUserState(EOA, CHAIN_ID, { aaMode: "7702" }),
    );

    session.resolveWallet(EOA, CHAIN_ID, {
      aaMode: "7702",
      smartAccount: null,
      smartAccount4337: null,
      delegation7702: DELEGATION_7702,
    });

    expect(session.getUserState()).toMatchObject({
      address: EOA,
      chain_id: CHAIN_ID,
      is_connected: true,
      wallet_kind: "eoa",
      aa_mode: "7702",
      smart_account_4337: null,
      delegation_7702: DELEGATION_7702,
      ext: { client_type: "ts_cli" },
    });

    session.close();
  });

  it("mode-exclusive: a 4337 tx after a 7702 tx nulls delegation_7702", () => {
    const session = makeSession(
      buildCliUserState(EOA, CHAIN_ID, { aaMode: "7702" }),
    );

    // 7702 tx first.
    session.resolveWallet(EOA, CHAIN_ID, {
      aaMode: "7702",
      smartAccount: null,
      smartAccount4337: null,
      delegation7702: DELEGATION_7702,
    });
    expect(session.getUserState()).toMatchObject({
      aa_mode: "7702",
      delegation_7702: DELEGATION_7702,
      smart_account_4337: null,
    });

    // Then a 4337 tx — Table B says writes are mode-exclusive on each call.
    session.resolveWallet(EOA, CHAIN_ID, {
      aaMode: "4337",
      smartAccount: SMART_ACCOUNT_4337,
      smartAccount4337: SMART_ACCOUNT_4337,
      delegation7702: null,
    });
    expect(session.getUserState()).toMatchObject({
      aa_mode: "4337",
      smart_account_4337: SMART_ACCOUNT_4337,
      delegation_7702: null,
    });

    session.close();
  });

  it("simulation prep call (no per-tx addresses passed) preserves prior post-tx AA addresses", () => {
    const session = makeSession(
      buildCliUserState(EOA, CHAIN_ID, {
        aaMode: "4337",
        smartAccount: SMART_ACCOUNT_4337,
      }),
    );

    // Previous 4337 tx populated the address.
    session.resolveWallet(EOA, CHAIN_ID, {
      aaMode: "4337",
      smartAccount: SMART_ACCOUNT_4337,
      smartAccount4337: SMART_ACCOUNT_4337,
      delegation7702: null,
    });

    // Next call is a pre-simulation prep — does NOT pass the per-tx
    // address fields (this matches wallet.ts:489 simulation call site).
    session.resolveWallet(EOA, CHAIN_ID, {
      aaMode: "4337",
      smartAccount: SMART_ACCOUNT_4337,
    });

    // Per Table B note: smart_account_4337 should NOT be wiped by a
    // connection-prep call. The reconciler preserves it under
    // same-address conditions.
    expect(session.getUserState()).toMatchObject({
      smart_account_4337: SMART_ACCOUNT_4337,
      delegation_7702: null,
    });

    session.close();
  });
});
