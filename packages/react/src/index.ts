export { BackendApi } from "./api/client";
export type {
  BackendSessionResponse,
  SessionMetadata,
  CreateSessionResponse,
  SessionMessage,
  SessionResponsePayload,
  SystemResponsePayload,
  SystemUpdate,
} from "./api/types";

export { AomiRuntimeProvider } from "./runtime/aomi-runtime";
export { useRuntimeActions, AomiRuntimeApiProvider } from "./runtime/interface";
export type { AomiRuntimeApi } from "./runtime/interface";

export {
  ThreadContextProvider,
  useThreadContext,
  useCurrentThreadMetadata,
  useCurrentThreadMessages,
} from "./state/thread-context";
export type { ThreadMetadata, ThreadStatus } from "./state/types";

export { toInboundSystem as constructSystemMessage, toInboundMessage as constructThreadMessage } from "./utils/conversion";
export { WalletSystemMessageEmitter, formatAddress, getNetworkName } from "./utils/wallet";
export type { WalletButtonState, WalletFooterProps } from "./utils/wallet";

export { cn } from "./lib/utils";
