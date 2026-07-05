type WalletChainType = "ethereum" | "solana";

export type SignerGrantWallet = {
  address: string;
  chainType: WalletChainType;
};

type AddSigners = ({
  address,
  signers,
}: {
  address: string;
  signers: Array<{ signerId: string; policyIds?: string[] }>;
}) => Promise<unknown>;

type EnsureServerSignerAccessParams = {
  wallets: SignerGrantWallet[];
  signerId: string;
  addSigners: AddSigners;
  retryDelaysMs?: number[];
  sleepFn?: (ms: number) => Promise<void>;
};

const DEFAULT_RETRY_DELAYS_MS = [0, 500, 1500];

export async function ensureServerSignerAccess({
  wallets,
  signerId,
  addSigners,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  sleepFn = sleep,
}: EnsureServerSignerAccessParams): Promise<string | null> {
  let lastError: string | null = null;

  for (const wallet of wallets) {
    for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
      const delayMs = retryDelaysMs[attempt];
      if (delayMs > 0) {
        await sleepFn(delayMs);
      }

      try {
        await addSigners({
          address: wallet.address,
          signers: [{ signerId, policyIds: [] }],
        });
        lastError = null;
        break;
      } catch (err) {
        const message = errMsg(err);
        if (isDuplicateSignerGrantError(message)) {
          lastError = null;
          break;
        }
        lastError = `${wallet.chainType}: ${message}`;
        // Privy rejects grants for wallets owned by another account
        // deterministically — retrying cannot succeed.
        if (isWalletOwnershipMismatchError(message)) {
          break;
        }
      }
    }

    if (lastError) {
      return lastError;
    }
  }

  return lastError;
}

export function isDuplicateSignerGrantError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("duplicate signer") ||
    normalized.includes("already been added")
  );
}

// Privy wording for the cross-account grant rejection, e.g. "Address to add
// signers too is not associated with current user." — the wallet in the
// payload belongs to a different Privy account than the live session.
export function isWalletOwnershipMismatchError(message: string): boolean {
  return message
    .trim()
    .toLowerCase()
    .includes("not associated with current user");
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
