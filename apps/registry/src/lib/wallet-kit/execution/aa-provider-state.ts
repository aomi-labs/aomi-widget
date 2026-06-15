"use client";

import type { Chain, Hex } from "viem";
import {
  createAAProviderState,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import { toClientAAOwner, type AomiAAOwnerInput } from "../aa/owner";
import {
  getPreferredRpcUrl,
  type WalletKitAAProviderPreference,
  type RequestedAAMode,
  type WalletExecutionCallList,
  type WalletProviderState,
} from "../wallet-execution";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() ?? "";
const ALCHEMY_GAS_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ?? "";
const AA_PROVIDER_OVERRIDE =
  process.env.NEXT_PUBLIC_AA_PROVIDER?.trim().toLowerCase();

function resolveAAProvider(
  preference: WalletKitAAProviderPreference = "auto",
): AAProvider | null {
  if (preference === "alchemy" || preference === "pimlico") {
    return preference;
  }

  if (
    AA_PROVIDER_OVERRIDE === "alchemy" ||
    AA_PROVIDER_OVERRIDE === "pimlico"
  ) {
    return AA_PROVIDER_OVERRIDE;
  }

  if (PIMLICO_API_KEY) return "pimlico";
  if (ALCHEMY_API_KEY) return "alchemy";
  return null;
}

export async function resolveExternalWalletAAProviderState({
  callList,
  chainsById,
  requestedMode,
  shouldUseExternalSigner,
  walletClient,
  address,
  sponsored,
  provider: providerPreference = "auto",
}: {
  callList: WalletExecutionCallList;
  chainsById: Record<number, Chain>;
  requestedMode: Exclude<RequestedAAMode, "none">;
  shouldUseExternalSigner: boolean;
  walletClient: EvmWalletRuntime["walletClient"];
  address: string | undefined;
  sponsored?: boolean;
  provider?: WalletKitAAProviderPreference;
}): Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}> {
  let resolvedMode: RequestedAAMode = requestedMode;
  let fallbackReason: string | undefined;
  if (requestedMode === "7702") {
    resolvedMode = "4337";
    fallbackReason = "requested_7702_connected_wallet_fallback_4337";
  }

  const provider = resolveAAProvider(providerPreference);
  if (!provider) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "aa_provider_not_configured_fallback_eoa",
    };
  }

  if (!shouldUseExternalSigner || !walletClient || !address) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "external_wallet_unavailable_fallback_eoa",
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

  const ownerInput: AomiAAOwnerInput = {
    kind: "external-wallet",
    walletClient,
    address: address as Hex,
  };

  try {
    const state = await createAAProviderState({
      provider,
      owner: toClientAAOwner(ownerInput),
      chain,
      rpcUrl: getPreferredRpcUrl(chain),
      callList,
      mode: resolvedMode as AAMode,
      apiKey,
      gasPolicyId: provider === "alchemy" ? ALCHEMY_GAS_POLICY_ID : undefined,
      sponsored,
    });

    if (!state.account || state.error) {
      console.warn(
        "[aomi-wallet-kit] External-wallet AA unavailable; falling back to EOA",
        {
          provider,
          mode: resolvedMode,
          error: state.error?.message ?? "account_unavailable",
        },
      );
      return {
        providerState: { resolved: null, pending: false, error: null },
        resolvedMode,
        fallbackReason:
          fallbackReason ??
          `aa_${provider}_external_wallet_unavailable_fallback_eoa`,
      };
    }

    return { providerState: state, resolvedMode, fallbackReason };
  } catch (error) {
    console.warn(
      "[aomi-wallet-kit] External-wallet AA init failed; falling back to EOA",
      {
        provider,
        mode: resolvedMode,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ??
        `aa_${provider}_external_wallet_initialization_failed_fallback_eoa`,
    };
  }
}
