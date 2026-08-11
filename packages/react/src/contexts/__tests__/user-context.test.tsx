import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { createRef, forwardRef, useImperativeHandle } from "react";

import { ExtUserProvider, UserState, useUser } from "../ext-user-context";

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
  it("wipes wallet identity but preserves the selected chain on disconnect", () => {
    const ref = renderHarness();

    act(() => {
      ref.current!.setUser({
        address: "0x1111111111111111111111111111111111111111",
        chain_id: 8453,
        is_connected: true,
        wallet_kind: "smart-account",
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
    expect(UserState.isConnected(u)).toBe(false);
    expect(u.evm).toEqual({ chain_id: 8453 });
    expect(u.svm).toBeUndefined();
    expect(u.pending).toMatchObject({
      evm_txs: { "1": { foo: "bar" } },
      evm_sigs: { "2": {} },
      svm_ixs: { "3": {} },
    });
    expect(UserState.walletProvider(u)).toBeUndefined();
    expect(UserState.authMethod(u)).toBeUndefined();
    expect(UserState.sponsored(u)).toBeUndefined();
    expect(UserState.sponsorProvider(u)).toBeUndefined();
    expect(UserState.sponsorAccount(u)).toBeUndefined();
  });

  it("clears per-tx AA fields but preserves pending requests during an address transition", () => {
    const ref = renderHarness();

    act(() => {
      ref.current!.setUser({
        address: "0x1111111111111111111111111111111111111111",
        chain_id: 8453,
        is_connected: true,
        wallet_kind: "smart-account",
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
    expect(UserState.address(u)).toBe("0x4444444444444444444444444444444444444444");
    // Identity-static fields persist across the in-place switch.
    expect(UserState.walletProvider(u)).toBe("para");
    expect(UserState.chainId(u)).toBe(8453);
    // Per-tx AA outputs + ens belonged to the prior address.
    expect(UserState.aaMode(u)).toBeUndefined();
    expect(UserState.SmartAccount4337(u)).toBeUndefined();
    expect(UserState.Delegation7702(u)).toBeUndefined();
    expect(UserState.ensName(u)).toBeUndefined();
    expect(u.pending).toMatchObject({
      evm_txs: { "1": {} },
      evm_sigs: { "2": {} },
      svm_ixs: { "3": {} },
    });
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
    expect(UserState.aaMode(u)).toBe("4337");
    expect(UserState.SmartAccount4337(u)).toBe(
      "0x2222222222222222222222222222222222222222",
    );
  });
});
