import type {
  Action,
  Event,
  EventPage,
  MessageEvent,
  TurnState,
} from "../agent/types";
import type { ActionAttempt, ActionCapabilities } from "../actions";
import type { UserState } from "../user-state";

export type SendResult = {
  messages: readonly MessageEvent[];
  title?: string;
};

export type SessionSnapshot = Readonly<{
  sessionId: string;
  cursor?: string;
  turnId?: string;
  turnState?: TurnState;
  events: readonly Event[];
  messages: readonly MessageEvent[];
  actions: readonly Action[];
  title?: string;
  isPolling: boolean;
  isSubmitting: boolean;
  actionAttempts: ReadonlyMap<string, ActionAttempt>;
  error?: unknown;
}>;

export type SessionOptions = {
  sessionId?: string;
  app?: string;
  model?: string | null;
  applicationId?: number | string | null;
  getUserState?: () => UserState | undefined;
  clientId?: string;
  pollIntervalMs?: number;
  logger?: { debug: (...args: unknown[]) => void };
  actions?: ActionCapabilities;
};

export type SessionRuntimeOptions = {
  app: string;
  model?: string | null;
  applicationId?: number | string | null;
  clientId?: string;
  getUserState?: () => UserState | undefined;
  actions?: ActionCapabilities;
};

export type { Action, Event, EventPage, TurnState };
