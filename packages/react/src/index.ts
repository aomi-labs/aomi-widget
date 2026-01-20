export { BackendApi } from "./backend/client";
export type {
  AomiMessage,
  ApiChatResponse,
  ApiCreateThreadResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
  ApiStateResponse,
  ApiSystemResponse,
  ApiThread,
} from "./backend/types";

export { AomiRuntimeProvider } from "./runtime/aomi-runtime";
export { useRuntimeActions, RuntimeActionsProvider } from "./contexts/runtime-actions";

export {
  ThreadContextProvider,
  useThreadContext,
  useCurrentThreadMetadata,
  useCurrentThreadMessages,
} from "./contexts/thread-context";
export type { ThreadMetadata, ThreadStatus } from "./state/types";

export { toInboundSystem as constructSystemMessage, toInboundMessage as constructThreadMessage } from "./utils/conversion";
export { WalletSystemMessageEmitter, formatAddress, getNetworkName } from "./utils/wallet";
export type { WalletButtonState, WalletFooterProps } from "./utils/wallet";

export { cn } from "./runtime/utils";
