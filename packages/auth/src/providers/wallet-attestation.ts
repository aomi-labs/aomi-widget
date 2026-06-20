import type { WalletFamily } from "../types";

export type AttestedWalletProvider = "privy" | "para" | (string & {});

export type WalletAttestationRequest = {
  provider: AttestedWalletProvider;
  /** Verified provider-token subject. */
  subject: string;
  email?: string | null;
};

export type WalletAttester = (
  input: Omit<WalletAttestationRequest, "provider">,
) => Promise<AttestedWallet[] | null>;

export type WalletAttesterRegistry = Record<string, WalletAttester | undefined>;

export type WalletAttestationLogger = Pick<typeof console, "warn">;

/** A wallet the provider attests is owned by the verified user and currently
 * custodied by that provider. Only these are eligible to become
 * `aomi_wallets` rows with `linked_via = provider`. */
export interface AttestedWallet {
  provider: AttestedWalletProvider;
  /** Stable provider-side wallet id. Stored on
   * `aomi_wallets.provider_wallet_id` for later server-side signing lookups. */
  providerWalletId: string;
  family: WalletFamily;
  address: string;
  /** Chain scope for the caip-10 derivation. `null` keeps the unique-index
   * key consistent with the SIWE convention (`coalesce(chain_scope,'*')`). */
  chainScope: string | null;
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
// Solana base58 addresses: 32-44 chars, no 0/O/I/l.
const SVM_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function validWalletAddress(
  family: WalletFamily,
  address: unknown,
): address is string {
  return (
    typeof address === "string" &&
    (family === "evm"
      ? EVM_ADDRESS_RE.test(address)
      : SVM_ADDRESS_RE.test(address))
  );
}

/** Fetch attested wallets through a provider registry. A missing attester or
 * transient provider failure returns `null`, which callers interpret as
 * "skip reconciliation" rather than "revoke every existing wallet". */
export async function fetchAttestedWallets(input: {
  request: WalletAttestationRequest;
  attesters: WalletAttesterRegistry;
  logger?: WalletAttestationLogger;
}): Promise<AttestedWallet[] | null> {
  const attester = input.attesters[input.request.provider];
  if (!attester) return null;
  try {
    const wallets = await attester({
      subject: input.request.subject,
      email: input.request.email,
    });
    return (
      wallets?.map((wallet) => ({
        ...wallet,
        provider: input.request.provider,
      })) ?? null
    );
  } catch (error) {
    input.logger?.warn(
      `syncProviderWallets: failed to list ${input.request.provider} wallets for ${input.request.subject}`,
      error,
    );
    return null;
  }
}
