import {
  UserState,
  type UserState as UserStateShape,
  type UserStateAAMode,
} from "../user-state";
import { isSubsetMatch, sortJson } from "./json";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    return isRecord(value[0]) ? value[0] : undefined;
  }
  return isRecord(value) ? value : undefined;
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
  aa?: {
    aaMode?: UserStateAAMode | null;
    smartAccount?: string | null;
    smartAccount4337?: string | null;
    delegation7702?: string | null;
  },
): UserStateShape {
  const resolvedAAMode =
    aa?.aaMode ?? (aa?.smartAccount === address ? "4337" : "none");
  const aaBlock: Record<string, unknown> = { mode: resolvedAAMode };

  if (aa?.smartAccount4337 !== undefined || aa?.delegation7702 !== undefined) {
    aaBlock.smart_account =
      resolvedAAMode === "4337" ? aa?.smartAccount4337 ?? null : null;
    aaBlock.delegation_7702 =
      resolvedAAMode === "7702" ? aa?.delegation7702 ?? null : null;
  }

  const prevEvm = firstRecord(userState?.evm) ?? {};
  const prevConn = isRecord(userState?.connection) ? userState?.connection : {};

  return {
    ...(userState ?? {}),
    evm: [
      {
        ...prevEvm,
        address,
        chain_id: chainId ?? 1,
        aa: aaBlock,
      },
    ],
    connection: {
      ...prevConn,
      is_connected: true,
    },
  };
}

export function warnIfUserStateMisaligned(
  expected: UserStateShape | undefined,
  actual: UserStateShape | null | undefined,
  opts?: { app?: string },
): void {
  const expectedUserState = UserState.normalize(expected);
  const normalizedActualUserState = normalizeComparableActualUserState(
    expectedUserState,
    UserState.reconcile(expectedUserState, actual),
    opts,
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

function normalizeComparableActualUserState(
  expected: UserStateShape | undefined,
  actual: UserStateShape | undefined,
  opts?: { app?: string },
): UserStateShape | undefined {
  if (opts?.app !== "byreal" || !expected || !actual) {
    return actual;
  }

  const expectedConn = isRecord(expected.connection) ? expected.connection : {};
  const actualConn = isRecord(actual.connection) ? actual.connection : {};
  const expectedSvm = isRecord(expected.svm) ? expected.svm : undefined;
  const actualSvm = isRecord(actual.svm) ? actual.svm : undefined;
  if (
    expectedConn.primary_family !== "svm" ||
    expectedConn.is_connected !== actualConn.is_connected ||
    !expectedSvm ||
    !actualSvm ||
    typeof expectedSvm.address !== "string" ||
    typeof actualSvm.address !== "string"
  ) {
    return actual;
  }

  return {
    ...actual,
    svm: {
      ...actualSvm,
      address: expectedSvm.address,
    },
  };
}
