import { describe, expect, it } from "vitest";

import { UserState } from "../src/index";

describe("normalizeUserState null pruning", () => {
  // Regression: the staging chat portal sent `svm.capabilities: null`, which the
  // backend's `SolCapabilitiesUserState(Vec<…>)` (a non-Option field) rejected
  // with a serde error → HTTP 400. `null` is never meaningful vs. absent in the
  // wallet blocks, so normalize must not emit it.
  it("drops svm.capabilities when null (the staging 400 payload)", () => {
    const normalized = UserState.normalize({
      connection: {
        is_connected: true,
        provider: "para",
        wallet_provider_subject: null,
        auth_method: null,
        auth_value: null,
        auth_verified_at: null,
      },
      evm: {
        address: "0xC764D92E312195114595cB645f31C38Fad9c14eE",
        chain_id: 1,
        sponsorship: {
          sponsored: false,
          sponsor_provider: "self",
          sponsor_account: null,
        },
      },
      svm: {
        address: null,
        cluster: "solana:mainnet",
        wallet_name: null,
        transport: null,
        capabilities: null,
      },
      ext: { client_type: "web_ui" },
    });

    // The non-Option `capabilities` (the field that 400'd) must be gone.
    expect(normalized?.svm).not.toHaveProperty("capabilities");
    expect(normalized?.svm?.cluster).toBe("solana:mainnet");
    // `is_connected` is preserved (it was a real boolean, not null).
    expect(normalized?.connection?.is_connected).toBe(true);
    // Option fields keep their nulls — the backend accepts them (verified
    // against staging: only `svm.capabilities: null` returned 400).
    expect(normalized?.evm?.sponsorship).toMatchObject({
      sponsored: false,
      sponsor_provider: "self",
    });
  });

  it("strips connection.is_connected when explicitly null (non-Option bool)", () => {
    const normalized = UserState.normalize({
      connection: { is_connected: null, provider: "para" },
    });
    expect(normalized?.connection).not.toHaveProperty("is_connected");
    expect(normalized?.connection?.provider).toBe("para");
  });

  it("preserves Option-field null tombstones (AA mode-exclusive clears)", () => {
    const normalized = UserState.normalize({
      evm: { address: "0xabc", aa: { mode: "4337", delegation_7702: null } },
    });
    // `delegation_7702: null` is a meaningful clear-signal; must survive.
    expect(normalized?.evm?.aa).toHaveProperty("delegation_7702", null);
  });

  it("preserves an empty capabilities array (valid wire value)", () => {
    const normalized = UserState.normalize({
      svm: { address: "So11111111111111111111111111111111111111112", capabilities: [] },
    });
    expect(normalized?.svm?.capabilities).toEqual([]);
  });

  it("keeps falsey-but-meaningful values (is_connected:false, chain_id:0 stays valid)", () => {
    const normalized = UserState.normalize({
      connection: { is_connected: false },
      evm: { address: "0xabc", sponsorship: { sponsored: false } },
    });
    expect(normalized?.connection).toEqual({ is_connected: false });
    expect(normalized?.evm?.sponsorship).toEqual({ sponsored: false });
  });

  it("does not prune nulls inside free-form ext", () => {
    const normalized = UserState.normalize({
      connection: { is_connected: true },
      ext: { client_type: "web_ui", custom: null },
    });
    expect(normalized?.ext).toEqual({ client_type: "web_ui", custom: null });
  });
});
