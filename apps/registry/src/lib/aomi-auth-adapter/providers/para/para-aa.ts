"use client";

import type { Chain, Hex } from "viem";
import type ParaWeb from "@getpara/react-sdk";
import {
  createAAProviderState,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import { toClientAAOwner, type AomiAAOwnerInput } from "../../aa/owner";
import type { AomiAuthIdentity } from "../../types";
import {
  getPreferredRpcUrl,
  type RequestedAAMode,
  type WalletExecutionCallList,
  type WalletProviderState,
} from "../../wallet-execution";
import type { useSafeWalletClient } from "../../runtime/evm/safe-hooks";

/**
 * Account-abstraction provider resolution for the Para adapter — which AA
 * backend (Alchemy/Pimlico) is configured, whether gas is sponsored, and the
 * per-transaction AA provider state with its EOA fallbacks.
 */

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() ?? "";
const ALCHEMY_GAS_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ?? "";
const AA_PROVIDER_OVERRIDE =
  process.env.NEXT_PUBLIC_AA_PROVIDER?.trim().toLowerCase();

function resolveAAProvider(): AAProvider | null {
  if (
    AA_PROVIDER_OVERRIDE === "alchemy" ||
    AA_PROVIDER_OVERRIDE === "pimlico"
  ) {
    return AA_PROVIDER_OVERRIDE;
  }

  if (ALCHEMY_API_KEY) return "alchemy";
  if (PIMLICO_API_KEY) return "pimlico";
  return null;
}

export function resolveParaSponsorship(): {
  sponsored: boolean;
  sponsorProvider: AomiAuthIdentity["sponsorProvider"];
  sponsorAccount: AomiAuthIdentity["sponsorAccount"];
} {
  const aaProvider = resolveAAProvider();
  if (aaProvider === "alchemy") {
    return {
      sponsored: Boolean(ALCHEMY_GAS_POLICY_ID),
      sponsorProvider: "alchemy",
      sponsorAccount: ALCHEMY_GAS_POLICY_ID || undefined,
    };
  }
  if (aaProvider === "pimlico") {
    return {
      sponsored: Boolean(PIMLICO_API_KEY),
      sponsorProvider: "pimlico",
      sponsorAccount: undefined,
    };
  }
  return {
    sponsored: false,
    sponsorProvider: "self",
    sponsorAccount: undefined,
  };
}

export async function resolveParaAAProviderState({
  callList,
  chainsById,
  requestedMode,
  shouldUseExternalSigner,
  paraSession,
  walletClient,
  address,
  sponsored,
}: {
  callList: WalletExecutionCallList;
  chainsById: Record<number, Chain>;
  requestedMode: Exclude<RequestedAAMode, "none">;
  shouldUseExternalSigner: boolean;
  paraSession: ParaWeb | null;
  walletClient: ReturnType<typeof useSafeWalletClient>["walletClient"];
  address: string | undefined;
  sponsored?: boolean;
}): Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}> {
  let resolvedMode: RequestedAAMode = requestedMode;
  let fallbackReason: string | undefined;
  if (requestedMode === "7702" && shouldUseExternalSigner) {
    resolvedMode = "4337";
    fallbackReason = "requested_7702_connected_wallet_fallback_4337";
  }

  const provider = resolveAAProvider();
  if (!provider) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "aa_provider_not_configured_fallback_eoa",
    };
  }

  const canUseExternalWalletOwner = Boolean(
    shouldUseExternalSigner && walletClient && address,
  );

  if (!paraSession && !canUseExternalWalletOwner) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason: fallbackReason ?? "para_session_unavailable_fallback_eoa",
    };
  }

  const chainId = callList[0]?.chainId;
  const chain = chainId ? chainsById[chainId] : undefined;
  if (!chainId || !chain) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason: fallbackReason ?? "aa_chain_not_supported_fallback_eoa",
    };
  }

  const apiKey =
    provider === "alchemy"
      ? ALCHEMY_API_KEY || undefined
      : PIMLICO_API_KEY || undefined;
  if (!apiKey) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_api_key_missing_fallback_eoa`,
    };
  }

  const ownerInput: AomiAAOwnerInput = canUseExternalWalletOwner
    ? {
        kind: "external-wallet",
        walletClient,
        address: address as Hex,
      }
    : {
        kind: "provider-session",
        provider: "para",
        session: paraSession,
        address: address as Hex | undefined,
      };
  const owner = toClientAAOwner(ownerInput);

  try {
    const state = await createAAProviderState({
      provider,
      owner,
      chain,
      rpcUrl: getPreferredRpcUrl(chain),
      callList,
      mode: resolvedMode as AAMode,
      apiKey,
      gasPolicyId: provider === "alchemy" ? ALCHEMY_GAS_POLICY_ID : undefined,
      sponsored,
    });

    if (!state.account || state.error) {
      console.warn("[aomi-auth-adapter] AA unavailable; falling back to EOA", {
        provider,
        mode: resolvedMode,
        error: state.error?.message ?? "account_unavailable",
      });
      return {
        providerState: { resolved: null, pending: false, error: null },
        resolvedMode,
        fallbackReason:
          fallbackReason ?? `aa_${provider}_account_unavailable_fallback_eoa`,
      };
    }

    return {
      providerState: state,
      resolvedMode,
      fallbackReason,
    };
  } catch (error) {
    console.warn("[aomi-auth-adapter] AA init failed; falling back to EOA", {
      provider,
      mode: resolvedMode,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_initialization_failed_fallback_eoa`,
    };
  }
}
