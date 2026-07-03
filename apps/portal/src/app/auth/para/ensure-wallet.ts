// Para only attests wallets that already exist: a fresh Para account has no
// embedded wallet, and a JWT issued for it carries empty `data.wallets` — the
// backend then rejects with "no wallets". This module guarantees the needed
// wallet family exists before the JWT is issued. Pure and injectable so the
// branch is unit-testable (see ensure-wallet.test.ts).

/// Para wire values for the embedded wallet families this flow supports
/// (`TWalletType` in @getpara/shared; also the `type` values inside the JWT's
/// wallet claims).
export type EmbeddedWalletType = "EVM" | "SOLANA";

type WalletLike = { type?: string; address?: string };

/// Guarantee an embedded wallet of `type` exists on the live Para account.
/// Returns null on success, a user-facing error message otherwise.
///
///   * `fetchWallets` — live server read (`para.fetchWallets()`), not the
///     hydrated account cache.
///   * `createWallet` — `createWalletAsync({ type })` from `useCreateWallet`.
///
/// A wallet only counts when it has an address — the backend drops
/// address-less claims. A failed create is re-checked against the live list
/// once: if the wallet materialized anyway (concurrent tab, provisioning
/// race), the goal is met and the error is moot.
export async function ensureEmbeddedWallet({
  type,
  fetchWallets,
  createWallet,
}: {
  type: EmbeddedWalletType;
  fetchWallets: () => Promise<WalletLike[]>;
  createWallet: (params: { type: EmbeddedWalletType }) => Promise<unknown>;
}): Promise<string | null> {
  let wallets: WalletLike[];
  try {
    wallets = await fetchWallets();
  } catch (err) {
    return `Could not read your Para wallets: ${errMsg(err)}`;
  }
  if (hasUsableWallet(wallets, type)) {
    return null;
  }

  try {
    await createWallet({ type });
    return null;
  } catch (err) {
    const recheck = await fetchWallets().catch(() => [] as WalletLike[]);
    if (hasUsableWallet(recheck, type)) {
      return null;
    }
    return `Could not create your Para ${type} wallet: ${errMsg(err)}`;
  }
}

function hasUsableWallet(
  wallets: WalletLike[],
  type: EmbeddedWalletType,
): boolean {
  return wallets.some(
    (wallet) => wallet.type === type && Boolean(wallet.address?.trim()),
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
