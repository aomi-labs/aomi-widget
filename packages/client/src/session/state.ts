import {
  UserState,
  type UserState as UserStateShape,
} from "../user-state";
import { isSubsetMatch, sortJson } from "./json";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function addExtValue(
  userState: UserStateShape | undefined,
  key: string,
  value: unknown,
): UserStateShape {
  const current = userState ?? {};
  const currentExt = isRecord(current["ext"]) ? current["ext"] : {};

  return {
    ...current,
    ext: {
      ...currentExt,
      [key]: value,
    },
  };
}

export function removeExtValue(
  userState: UserStateShape | undefined,
  key: string,
): UserStateShape | undefined {
  if (!userState) return undefined;
  const currentExt = userState["ext"];
  if (!isRecord(currentExt)) return undefined;

  const nextExt = { ...currentExt };
  delete nextExt[key];

  // Pass the empty ext explicitly rather than omitting it; omission means
  // "preserve prior" to reconcile, while an empty object means intentional clear.
  return { ...userState, ext: nextExt };
}

export function resolveWalletState(
  userState: UserStateShape | undefined,
  address: string,
  chainId: number | undefined,
): UserStateShape {
  // Account-abstraction / sponsorship are backend authority and are resolved by
  // the execution-profile endpoint, not carried in user_state. This only records
  // the connected owner and chain.
  const prevEvm = isRecord(userState?.evm) ? userState?.evm : {};
  const prevConn = isRecord(userState?.connection) ? userState?.connection : {};

  return {
    ...(userState ?? {}),
    evm: {
      ...prevEvm,
      address,
      chain_id: chainId ?? 1,
    },
    connection: {
      ...prevConn,
      is_connected: true,
    },
  };
}

export function warnIfUserStateMisaligned(
  expected: UserStateShape | undefined,
  actual: UserStateShape | null | undefined,
): void {
  const expectedUserState = UserState.normalize(expected);
  const normalizedActualUserState = UserState.reconcile(
    expectedUserState,
    actual,
  );

  if (!expectedUserState || !normalizedActualUserState) {
    return;
  }

  if (!isSubsetMatch(expectedUserState, normalizedActualUserState)) {
    const expectedJson = JSON.stringify(sortJson(expectedUserState));
    const actualJson = JSON.stringify(sortJson(normalizedActualUserState));
    console.warn(
      `[session] Backend user_state mismatch (non-fatal). expected subset=${expectedJson} actual=${actualJson}`,
    );
  }
}
