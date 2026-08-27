import type { components } from "../generated/agent-v1/types";

type Schemas = components["schemas"];

export type Event = Schemas["ConcreteEvent"];
export type EventPage = Schemas["EventPage"];
export type MessageEvent = Schemas["MessageEvent"];
export type TurnStateChangedEvent = Schemas["TurnStateChangedEvent"];
export type ToolEvent = Schemas["ToolEvent"];
export type TaskEvent = Schemas["TaskEvent"];
export type TitleEvent = Schemas["TitleEvent"];
export type ErrorEvent = Schemas["ErrorEvent"];
export type Action = Schemas["Action"];
export type ActionRequest = Schemas["ActionRequest"];
export type ActionResult = Schemas["ActionResult"];
export type UserState = Schemas["UserState"];
export type StartTurnIntent = Schemas["StartTurnIntent"];
export type InterruptIntent = Schemas["InterruptIntent"];
export type RespondToActionIntent = Schemas["RespondToActionIntent"];
export type Session = Schemas["Session"];
export type SessionPage = Schemas["SessionPage"];
export type ErrorBody = Schemas["ErrorEnvelope"];
export type TurnState = TurnStateChangedEvent["state"];
