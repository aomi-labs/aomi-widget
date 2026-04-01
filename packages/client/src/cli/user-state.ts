import type { UserState } from "../types";

export function buildCliUserState(
  publicKey?: string,
  chainId?: number,
): UserState | undefined {
  if (publicKey === undefined && chainId === undefined) {
    return undefined;
  }

  const userState: UserState = {};

  if (publicKey !== undefined) {
    userState.address = publicKey;
    userState.isConnected = true;
  }

  if (chainId !== undefined) {
    userState.chainId = chainId;
  }

  return userState;
}
