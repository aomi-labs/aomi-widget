import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { createRef, forwardRef, useImperativeHandle } from "react";

import { ExtUserProvider, useUser } from "../ext-user-context";

type Handle = ReturnType<typeof useUser>;

const Harness = forwardRef<Handle>((_, ref) => {
  const api = useUser();
  useImperativeHandle(ref, () => api, [api]);
  return null;
});
Harness.displayName = "Harness";

afterEach(() => {
  cleanup();
});

function renderHarness() {
  const ref = createRef<Handle>();
  render(
    <ExtUserProvider>
      <Harness ref={ref} />
    </ExtUserProvider>,
  );
  return ref;
}

describe("ExtUserProvider.setUser", () => {
  it("wipes all wallet-bound fields on disconnect", () => {
    const ref = renderHarness();

    act(() => {
      ref.current!.setUser({
        address: "0x1111111111111111111111111111111111111111",
        chain_id: 8453,
        is_connected: true,
        aa_mode: "4337",
        smart_account_4337: "0x2222222222222222222222222222222222222222",
        delegation_7702: "0x3333333333333333333333333333333333333333",
        svm_address: "Bv9...",
        wallet_provider: "baseAccount",
        auth_method: "wagmi",
        sponsored: true,
        sponsor_provider: "coinbase",
        sponsor_account: "gp_test",
        ens_name: "alice.eth",
        pending_txs: { "1": { foo: "bar" } },
        pending_eip712s: { "2": {} },
        pending_solana_txs: { "3": {} },
      });
    });

    act(() => {
      ref.current!.setUser({ is_connected: false });
    });

    const u = ref.current!.user;
    expect(u.is_connected).toBe(false);
    expect(u.address).toBeUndefined();
    expect(u.chain_id).toBeUndefined();
    expect(u.ens_name).toBeUndefined();
    expect(u.aa_mode).toBeUndefined();
    expect(u.smart_account_4337).toBeUndefined();
    expect(u.delegation_7702).toBeUndefined();
    expect(u.svm_address).toBeUndefined();
    expect(u.wallet_provider).toBeUndefined();
    expect(u.auth_method).toBeUndefined();
    expect(u.sponsored).toBeUndefined();
    expect(u.sponsor_provider).toBeUndefined();
    expect(u.sponsor_account).toBeUndefined();
    expect(u.pending_txs).toBeUndefined();
    expect(u.pending_eip712s).toBeUndefined();
    expect(u.pending_solana_txs).toBeUndefined();
  });

  it("clears per-tx AA fields when address changes while still connected", () => {
    const ref = renderHarness();

    act(() => {
      ref.current!.setUser({
        address: "0x1111111111111111111111111111111111111111",
        chain_id: 8453,
        is_connected: true,
        aa_mode: "4337",
        smart_account_4337: "0x2222222222222222222222222222222222222222",
        delegation_7702: "0x3333333333333333333333333333333333333333",
        wallet_provider: "para",
        ens_name: "alice.eth",
        pending_txs: { "1": {} },
        pending_eip712s: { "2": {} },
        pending_solana_txs: { "3": {} },
      });
    });

    act(() => {
      ref.current!.setUser({
        address: "0x4444444444444444444444444444444444444444",
      });
    });

    const u = ref.current!.user;
    expect(u.address).toBe("0x4444444444444444444444444444444444444444");
    // Identity-static fields persist across the in-place switch.
    expect(u.wallet_provider).toBe("para");
    expect(u.chain_id).toBe(8453);
    // Per-tx AA outputs + ens + pending maps belonged to the prior address.
    expect(u.aa_mode).toBeUndefined();
    expect(u.smart_account_4337).toBeUndefined();
    expect(u.delegation_7702).toBeUndefined();
    expect(u.ens_name).toBeUndefined();
    expect(u.pending_txs).toBeUndefined();
    expect(u.pending_eip712s).toBeUndefined();
    expect(u.pending_solana_txs).toBeUndefined();
  });

  it("preserves AA fields when the same address re-sets (case-insensitive)", () => {
    const ref = renderHarness();

    act(() => {
      ref.current!.setUser({
        address: "0x1111111111111111111111111111111111111111",
        chain_id: 8453,
        is_connected: true,
        aa_mode: "4337",
        smart_account_4337: "0x2222222222222222222222222222222222222222",
      });
    });

    act(() => {
      ref.current!.setUser({
        address: "0x1111111111111111111111111111111111111111".toUpperCase(),
      });
    });

    const u = ref.current!.user;
    expect(u.aa_mode).toBe("4337");
    expect(u.smart_account_4337).toBe(
      "0x2222222222222222222222222222222222222222",
    );
  });
});
