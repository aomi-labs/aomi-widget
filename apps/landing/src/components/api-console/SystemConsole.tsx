"use client";

import { ApiConsole } from "./ApiConsole";
import type { EndpointDef } from "./ApiConsole";

const SESSION_HEADER = {
  key: "X-Session-Id",
  placeholder: "session-uuid",
  required: true,
};

const API_KEY_HEADER = {
  key: "X-API-Key",
  placeholder: "your-api-key (optional)",
};

const ENDPOINTS: EndpointDef[] = [
  {
    label: "Get State",
    method: "GET",
    path: "/api/state",
    description:
      "Fetch the current session state: messages, system events, title, and processing status.",
    params: [
      {
        key: "user_state",
        placeholder: '{"chain_id":1,"address":"0x…"}',
      },
    ],
    headers: [SESSION_HEADER],
  },
  {
    label: "Chat",
    method: "POST",
    path: "/api/chat",
    description:
      "Send a chat message. Returns updated messages and processing status.",
    params: [
      { key: "message", placeholder: "Hello!", required: true },
      { key: "app", placeholder: "default", required: true },
      { key: "public_key", placeholder: "0x…" },
    ],
    headers: [SESSION_HEADER, API_KEY_HEADER],
  },
  {
    label: "System Message",
    method: "POST",
    path: "/api/system",
    description:
      "Send a system-level message. Returns { res: AomiMessage | null }.",
    params: [
      {
        key: "message",
        placeholder: "System instruction…",
        required: true,
      },
    ],
    headers: [SESSION_HEADER],
  },
  {
    label: "Interrupt",
    method: "POST",
    path: "/api/interrupt",
    description:
      "Interrupt the current agent processing and return the latest session state.",
    headers: [SESSION_HEADER],
  },
  {
    label: "System Events",
    method: "GET",
    path: "/api/events",
    description:
      "Fetch recent system events (InlineCall, SystemNotice, SystemError).",
    params: [
      {
        key: "count",
        placeholder: "10",
      },
    ],
    headers: [SESSION_HEADER],
  },
  {
    label: "Get Apps",
    method: "GET",
    path: "/api/control/apps",
    description: "List available apps (agents) for the current context.",
    params: [
      { key: "public_key", placeholder: "0x…" },
    ],
    headers: [SESSION_HEADER, API_KEY_HEADER],
  },
  {
    label: "Get Models",
    method: "GET",
    path: "/api/control/models",
    description: "List available LLM models.",
    headers: [SESSION_HEADER],
  },
  {
    label: "Set Model",
    method: "POST",
    path: "/api/control/model",
    description:
      "Set the model for a session. Returns { success, rig, baml, created }.",
    params: [
      { key: "rig", placeholder: "gpt-4o", required: true },
      { key: "app", placeholder: "default" },
    ],
    headers: [SESSION_HEADER, API_KEY_HEADER],
  },
];

export function SystemConsole() {
  return <ApiConsole endpoints={ENDPOINTS} />;
}
