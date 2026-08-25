// =============================================================================
// CLI UserState — end-to-end wire shape
// =============================================================================
// Drives the real `ClientSession` + `buildCliUserState` + `session.resolveWallet`
// pipeline (no network — the SSE subscribe is the only client method
// invoked). Each test asserts the exact UserState shape sent on the wire:
// {connection, evm, svm, ext} with AA fields absent (backend authority).
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
const CHAIN_ID = 1;

function fakeClient(): AomiClient {
  // ClientSession ctor instance-checks the client and only calls
  // `subscribeSSE` synchronously; resolveWallet / getUserState don't hit
  // the network at all. Real instance + stubbed subscribe satisfies the
  // type guard without leaking any HTTP from these tests.
  const client = new AomiClient({ baseUrl: "http://test.invalid" });
  (
    client as unknown as { subscribeSSE: AomiClient["subscribeSSE"] }
  ).subscribeSSE = () => () => {};
  return client;
}

function makeSession(initialUserState?: ReturnType<typeof buildCliUserState>) {
  return new ClientSession(fakeClient(), {
    sessionId: "test-session",
    clientId: "test-client",
    app: "default",
    userState: initialUserState,
    clientType: CLIENT_TYPE_TS_CLI,
  });
}

// ---------------------------------------------------------------------------
// Connect-time
// ---------------------------------------------------------------------------
//
// Account-abstraction and sponsorship are backend authority (resolved by the
// execution-profile endpoint and per-execution operation payloads). The CLI's
// user_state carries only the owner, chain, connection, and client_type; it
// never persists aa/sponsorship. The `--aa` preference is applied per
// transaction via the execution payload, not stored here.

describe("CLI UserState — connect-time", () => {
  it("carries address + chain + is_connected + ts_cli client_type, no aa/sponsorship", () => {
    const session = makeSession(buildCliUserState(EOA, CHAIN_ID));
    const state = session.getUserState();

    expect(state).toEqual({
      evm: { address: EOA, chain_id: CHAIN_ID },
      connection: { is_connected: true },
      ext: { client_type: "ts_cli" },
    });
    expect(state?.evm).not.toHaveProperty("aa");
    expect(state?.evm).not.toHaveProperty("sponsorship");

    session.close();
  });
});

// ---------------------------------------------------------------------------
// Post-tx
// ---------------------------------------------------------------------------

describe("CLI UserState — post-tx", () => {
  it("resolveWallet records owner/chain and never writes aa/sponsorship", () => {
    const session = makeSession(buildCliUserState(EOA, CHAIN_ID));

    session.resolveWallet(EOA, CHAIN_ID);

    const state = session.getUserState();
    expect(state).toMatchObject({
      evm: { address: EOA, chain_id: CHAIN_ID },
      connection: { is_connected: true },
      ext: { client_type: "ts_cli" },
    });
    expect(state?.evm).not.toHaveProperty("aa");
    expect(state?.evm).not.toHaveProperty("sponsorship");

    session.close();
  });
});
