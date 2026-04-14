import type { Chain } from "viem";

import { adaptSmartAccount } from "../adapt";
import type { AAState, AAMode, AAWalletCall } from "../types";
import {
  getMissingOwnerState,
  getOwnerParams,
  getUnsupportedAdapterState,
  type AAOwner,
} from "../owner";
import { resolvePimlicoConfig } from "./resolve";

export interface CreatePimlicoAAStateOptions {
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: AAWalletCall[];
  mode?: AAMode;
  apiKey?: string;
}

export async function createPimlicoAAState(
  options: CreatePimlicoAAStateOptions,
): Promise<AAState> {
  const {
    chain,
    owner,
    rpcUrl,
    callList,
    mode,
  } = options;

  const resolved = resolvePimlicoConfig({
    calls: callList,
    chainsById: { [chain.id]: chain },
    rpcUrl,
    modeOverride: mode,
    throwOnMissingConfig: true,
    apiKey: options.apiKey,
  });

  if (!resolved) {
    throw new Error("Pimlico AA config resolution failed.");
  }

  const apiKey = options.apiKey ?? resolved.apiKey;
  const execution = {
    ...resolved,
    fallbackToEoa: false,
  } as AAState["resolved"];

  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }

  try {
    const { createPimlicoSmartAccount } = await import("@getpara/aa-pimlico");
    const smartAccount = await createPimlicoSmartAccount({
      ...ownerParams.ownerParams,
      apiKey,
      chain,
      rpcUrl,
      mode: execution!.mode,
    });

    if (!smartAccount) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: new Error("Pimlico AA account could not be initialized."),
      };
    }

    return {
      resolved: execution,
      account: adaptSmartAccount(smartAccount),
      pending: false,
      error: null,
    };
  } catch (error) {
    return {
      resolved: execution,
      account: null,
      pending: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
