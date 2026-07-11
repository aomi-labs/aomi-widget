"use client";

import type { Chain, Hex } from "viem";
import {
  createAAProviderState,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import { toClientAAOwner, type AomiAAOwnerInput } from "./aa-owner";
import {
  getPreferredRpcUrl,
  type WalletKitAAProviderPreference,
  type RequestedAAMode,
  type WalletExecutionCallList,
  type WalletProviderState,
} from "./wallet-execution";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() ?? "";
const ALCHEMY_GAS_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const AA_PROVIDER_OVERRIDE =
  process.env.NEXT_PUBLIC_AA_PROVIDER?.trim().toLowerCase();

function resolveAAProvider(
  preference: WalletKitAAProviderPreference = "auto",
): AAProvider | null {
  if (preference === "alchemy") {
    return preference;
  }

  if (AA_PROVIDER_OVERRIDE === "alchemy") {
    return AA_PROVIDER_OVERRIDE;
  }

  if (ALCHEMY_API_KEY) return "alchemy";
  return null;
}

type AAOwnerStrategy =
  | { kind: "external-wallet" }
  | { kind: "provider-session"; provider: string; session: unknown };

type ResolveAAProviderStateParams = {
  callList: WalletExecutionCallList;
  chainsById: Record<number, Chain>;
  requestedMode: Exclude<RequestedAAMode, "none">;
  shouldUseExternalSigner: boolean;
  walletClient: EvmWalletRuntime["walletClient"];
  address: string | undefined;
  sponsored?: boolean;
  provider?: WalletKitAAProviderPreference;
  ownerStrategy: AAOwnerStrategy;
};

type ResolvedAAProviderState = Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}>;

export async function resolveAAProviderState({
  callList,
  chainsById,
  requestedMode,
  shouldUseExternalSigner,
  walletClient,
  address,
  sponsored,
  provider: providerPreference = "auto",
  ownerStrategy,
}: ResolveAAProviderStateParams): ResolvedAAProviderState {
  let resolvedMode: RequestedAAMode = requestedMode;
  let fallbackReason: string | undefined;
  if (
    requestedMode === "7702" &&
    (ownerStrategy.kind === "external-wallet" || shouldUseExternalSigner)
  ) {
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

  const canUseExternalWalletOwner = Boolean(
    shouldUseExternalSigner && walletClient && address,
  );
  if (
    ownerStrategy.kind === "external-wallet" &&
    !canUseExternalWalletOwner
  ) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "external_wallet_unavailable_fallback_eoa",
    };
  }
  if (
    ownerStrategy.kind === "provider-session" &&
    !ownerStrategy.session &&
    !canUseExternalWalletOwner
  ) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason: fallbackReason ?? "provider_session_unavailable_fallback_eoa",
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

  const apiKey = ALCHEMY_API_KEY || undefined;
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
        provider:
          ownerStrategy.kind === "provider-session"
            ? ownerStrategy.provider
            : "provider",
        session:
          ownerStrategy.kind === "provider-session"
            ? ownerStrategy.session
            : null,
        address: address as Hex | undefined,
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
      gasPolicyId: ALCHEMY_GAS_POLICY_ID,
      sponsored,
    });

    if (!state.account || state.error) {
      console.warn(
        "[aomi-wallet-kit] AA unavailable; falling back to EOA",
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
          fallbackReason ?? `aa_${provider}_account_unavailable_fallback_eoa`,
      };
    }

    return { providerState: state, resolvedMode, fallbackReason };
  } catch (error) {
    console.warn(
      "[aomi-wallet-kit] AA init failed; falling back to EOA",
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
        fallbackReason ?? `aa_${provider}_initialization_failed_fallback_eoa`,
    };
  }
}

export function resolveAASponsorship(
  providerPreference: WalletKitAAProviderPreference = "auto",
): {
  sponsored: boolean;
  sponsorProvider: "alchemy" | "self";
  sponsorAccount?: string;
} {
  const aaProvider = resolveAAProvider(providerPreference);
  if (aaProvider === "alchemy") {
    return {
      sponsored: Boolean(ALCHEMY_GAS_POLICY_ID),
      sponsorProvider: "alchemy",
      sponsorAccount: ALCHEMY_GAS_POLICY_ID || undefined,
    };
  }
  return {
    sponsored: false,
    sponsorProvider: "self",
    sponsorAccount: undefined,
  };
}
