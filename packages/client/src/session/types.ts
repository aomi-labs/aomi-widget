import type { Action, Event, EventPage, TurnState } from "../agent/types";
import type { ActionCapabilities } from "../actions";
import type { AomiClientType, UserState } from "../user-state";
import type { AomiMessage } from "../types";

export type SendResult = {
  messages: AomiMessage[];
  title?: string;
};

export type SessionOptions = {
  sessionId?: string;
  app?: string;
  model?: string | null;
  applicationId?: number | string | null;
  userState?: UserState;
  clientType?: AomiClientType;
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
  userState?: UserState;
  actions?: ActionCapabilities;
};

type MessageEvent = Extract<Event, { type: "message" }>;
type TurnEvent = Extract<Event, { type: "turn_state_changed" }>;
type ToolEvent = Extract<Event, { type: "tool_update" | "tool_complete" }>;
type TaskEvent = Extract<
  Event,
  { type: "task_started" | "task_activity" | "task_completed" }
>;
type TitleEvent = Extract<Event, { type: "title_changed" }>;
type ErrorEvent = Extract<Event, { type: "error" }>;

export type SessionEventMap = {
  event: Event;
  action: Action;
  message: MessageEvent;
  messages: AomiMessage[];
  turn_state_changed: TurnEvent;
  tool_update: ToolEvent;
  tool_complete: ToolEvent;
  task_started: TaskEvent;
  task_activity: TaskEvent;
  task_completed: TaskEvent;
  title_changed: TitleEvent;
  system_error: ErrorEvent;
  user_state_updated: UserState;
  processing_start: undefined;
  processing_end: undefined;
  backend_idle: undefined;
  error: { error: unknown };
  "*": { type: string; payload: unknown };
};

export type { Action, Event, EventPage, TurnState };
