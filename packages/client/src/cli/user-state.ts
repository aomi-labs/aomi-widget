import {
  addUserStateExt,
  CLIENT_TYPE_TS_CLI,
  type UserState,
} from "../types";

export function buildCliUserState(
  publicKey?: string,
  chainId?: number,
): UserState {
  const userState: UserState = {};

  if (publicKey !== undefined) {
    userState.address = publicKey;
    userState.isConnected = true;
  }

  if (chainId !== undefined) {
    userState.chainId = chainId;
  }

  return addUserStateExt(userState, "client_type", CLIENT_TYPE_TS_CLI);
}
