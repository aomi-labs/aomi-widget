import "server-only";

import { getPool } from "@aomi-labs/account";

/**
 * Which wallet a headless MCP turn operates on.
 *
 * The portal's browser surface learns the operating wallet from a live
 * connection. MCP has no browser, so it used to infer one: read the account's
 * `public_keys` and take the first row by `is_primary desc, created_at asc`.
 * That inference is silent and unfalsifiable from the caller's side — when it
 * picks the wrong wallet the agent reports a real balance for an account the user
 * is not looking at, which reads as a broken RPC or a token misconfiguration
 * rather than as the wrong wallet.
 *
 * The rule here is that an operating wallet is only ever *chosen*, never
 * guessed:
 *
 *   1. an address the caller passed explicitly, after checking the account
 *      owns it;
 *   2. otherwise the choice this session already made, if the account still
 *      owns it;
 *   3. otherwise the account's only wallet in that family — not a preference,
 *      just the absence of a choice to make;
 *   4. otherwise nothing, and the turn fails with `wallet_selection_required`.
 *
 * Selection is cached per session so a caller states the wallet once rather
 * than on every turn, and re-validated on every read so a wallet unlinked from
 * the account cannot keep operating through a stale row.
 */
export type WalletFamily = "evm" | "svm";

/** A wallet the account demonstrably owns, per `public_keys`. */
export type AccountWallet = {
  family: WalletFamily;
  address: string;
  isPrimary: boolean;
};

/** Addresses the MCP caller named for this turn. */
export type RequestedWallets = Partial<Record<WalletFamily, string>>;

/** Addresses this turn may operate on. A family absent here has no wallet. */
export type ResolvedWallets = Partial<Record<WalletFamily, string>>;

export type WalletSelectionFailure =
  | {
      error: "wallet_selection_required";
      selection_required: Array<{
        family: WalletFamily;
        wallets: Array<{ address: string; is_primary: boolean }>;
      }>;
      guidance: string;
    }
  | {
      error: "wallet_not_owned";
      family: WalletFamily;
      requested: string;
      guidance: string;
    }
  | {
      error: "wallet_lookup_unavailable";
      guidance: string;
    };

export type WalletResolution =
  | { ok: true; wallets: ResolvedWallets }
  | { ok: false; failure: WalletSelectionFailure };

const FAMILIES: readonly WalletFamily[] = ["evm", "svm"];

export function normalizeAddress(
  family: WalletFamily,
  address: string,
): string {
  // EVM addresses are case-insensitive (EIP-55 is a checksum, not identity);
  // base58 Solana addresses are not.
  const trimmed = address.trim();
  return family === "evm" ? trimmed.toLowerCase() : trimmed;
}

export function sameAddress(
  family: WalletFamily,
  left: string,
  right: string,
): boolean {
  return normalizeAddress(family, left) === normalizeAddress(family, right);
}

/**
 * Resolve the operating wallet per family for one MCP turn.
 *
 * `familyInPlay` narrows the check to the chain the caller declared via
 * `chain_context`. Without it every family the account holds is in play, so an
 * account with two EVM wallets must choose before the turn runs. That is the
 * intended cost: the alternative is picking one and being silently wrong.
 */
export async function resolveSessionWallets(input: {
  canonicalUserId: string;
  sessionId: string;
  requested?: RequestedWallets;
  familyInPlay?: WalletFamily;
}): Promise<WalletResolution> {
  const requested = input.requested ?? {};
  const owned = await ownedWallets(input.canonicalUserId);
  if (!owned) {
    return {
      ok: false,
      failure: {
        error: "wallet_lookup_unavailable",
        guidance:
          "Aomi could not read this account's wallets, so it cannot confirm which wallet to operate on. Retry shortly.",
      },
    };
  }
  const recorded = await readSelections(input.canonicalUserId, input.sessionId);
  const families = input.familyInPlay ? [input.familyInPlay] : FAMILIES;

  const wallets: ResolvedWallets = {};
  const ambiguous: Array<{
    family: WalletFamily;
    wallets: Array<{ address: string; is_primary: boolean }>;
  }> = [];

  for (const family of families) {
    const candidates = owned.filter((wallet) => wallet.family === family);
    const asked = requested[family]?.trim();

    if (asked) {
      const match = candidates.find((wallet) =>
        sameAddress(family, wallet.address, asked),
      );
      if (!match) {
        // Fail closed rather than falling back to a wallet the account does
        // own: a caller naming an address it cannot use is a mistake worth
        // surfacing, and silently substituting another wallet would be the
        // original bug wearing a different hat.
        return {
          ok: false,
          failure: {
            error: "wallet_not_owned",
            family,
            requested: asked,
            guidance:
              `This Aomi account has no ${family.toUpperCase()} wallet ${asked}. ` +
              "It may belong to a different Aomi account than the one this MCP client is authorized as. " +
              "Confirm which account the user intends, then pass one of its wallets.",
          },
        };
      }
      wallets[family] = match.address;
      // A caller naming a different wallet than the session holds is a
      // deliberate switch, so the session follows it from here.
      if (
        !recorded[family] ||
        !sameAddress(family, recorded[family]!, match.address)
      ) {
        await recordSelection(
          input.canonicalUserId,
          input.sessionId,
          family,
          match.address,
        );
      }
      continue;
    }

    const remembered = recorded[family];
    if (remembered) {
      const match = candidates.find((wallet) =>
        sameAddress(family, wallet.address, remembered),
      );
      if (match) {
        wallets[family] = match.address;
        continue;
      }
      // The account no longer owns what this session chose — unlinked, or
      // switched on another surface. Drop it and re-decide below.
      await clearSelection(input.sessionId, family);
    }

    if (candidates.length === 0) continue;
    if (candidates.length === 1) {
      const only = candidates[0]!.address;
      wallets[family] = only;
      await recordSelection(
        input.canonicalUserId,
        input.sessionId,
        family,
        only,
      );
      continue;
    }

    ambiguous.push({
      family,
      wallets: candidates.map((wallet) => ({
        address: wallet.address,
        is_primary: wallet.isPrimary,
      })),
    });
  }

  if (ambiguous.length > 0) {
    return {
      ok: false,
      failure: {
        error: "wallet_selection_required",
        selection_required: ambiguous,
        guidance:
          "This Aomi account holds more than one wallet, so Aomi will not guess which one to operate on. " +
          "Ask the user which wallet they mean, then retry with wallet.evm_address / wallet.svm_address. " +
          "The choice is remembered for the rest of this session.",
      },
    };
  }

  return { ok: true, wallets };
}

/**
 * Every wallet the account owns, primary first.
 *
 * Returns `undefined` when the account graph cannot be read. That is not the
 * same as "this account has no wallets": treating a failed lookup as an empty
 * result would reject a perfectly good address as `wallet_not_owned` and send
 * the caller hunting for an account mix-up that never happened.
 */
async function ownedWallets(
  canonicalUserId: string,
): Promise<AccountWallet[] | undefined> {
  let rows: Array<Record<string, unknown>> = [];
  try {
    const result = await getPool().query(
      `select chain_type, address, is_primary
         from public_keys
        where user_id = $1
        order by is_primary desc, created_at asc`,
      [canonicalUserId],
    );
    rows = result.rows;
  } catch {
    return undefined;
  }
  return rows.flatMap((row) => {
    const family = walletFamily(row.chain_type);
    if (!family) return [];
    const address = String(row.address ?? "").trim();
    if (!address) return [];
    return [{ family, address, isPrimary: Boolean(row.is_primary) }];
  });
}

function walletFamily(value: unknown): WalletFamily | undefined {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "evm") return "evm";
  if (raw === "svm" || raw === "solana") return "svm";
  return undefined;
}

async function readSelections(
  canonicalUserId: string,
  sessionId: string,
): Promise<Partial<Record<WalletFamily, string>>> {
  try {
    const result = await getPool().query(
      `select chain_family, address
         from mcp_session_wallets
        where session_id = $1 and user_id = $2`,
      [sessionId, canonicalUserId],
    );
    const selections: Partial<Record<WalletFamily, string>> = {};
    for (const row of result.rows) {
      const family = walletFamily(row.chain_family);
      if (family) selections[family] = String(row.address);
    }
    return selections;
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
    // Before the migration lands the surface simply has no memory: every
    // ambiguous turn asks for an explicit wallet. Degraded, never wrong.
    return {};
  }
}

async function recordSelection(
  canonicalUserId: string,
  sessionId: string,
  family: WalletFamily,
  address: string,
): Promise<void> {
  try {
    await getPool().query(
      `insert into mcp_session_wallets (session_id, user_id, chain_family, address)
            values ($1, $2, $3, $4)
       on conflict (session_id, chain_family)
       do update set address = excluded.address,
                     user_id = excluded.user_id,
                     selected_at = extract(epoch from now())::bigint`,
      [sessionId, canonicalUserId, family, address],
    );
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
  }
}

async function clearSelection(
  sessionId: string,
  family: WalletFamily,
): Promise<void> {
  try {
    await getPool().query(
      `delete from mcp_session_wallets
        where session_id = $1 and chain_family = $2`,
      [sessionId, family],
    );
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
  }
}

function isMissingRelation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "42P01"
  );
}
