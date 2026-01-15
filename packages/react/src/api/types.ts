export interface SessionMessage {
  sender?: string;
  content?: string;
  timestamp?: string;
  tool_result?: [string, string] | { topic?: unknown; content?: unknown } | null;
}

export interface SessionResponsePayload {
  messages?: SessionMessage[] | null;
  system_events?: unknown[] | null;
  title?: string | null;
  is_processing?: boolean;
  session_exists?: boolean;
  session_id?: string;
  pending_wallet_tx?: string | null;
}

export type BackendSessionResponse = SessionResponsePayload;

export interface SystemResponsePayload {
  res?: SessionMessage | null;
}

export interface BackendThreadMetadata {
  session_id: string;
  title: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
}

export interface CreateThreadResponse {
  session_id: string;
  title?: string;
}

export type SystemUpdate = {
  type: "TitleChanged";
  data: {
    session_id: string;
    new_title: string;
  };
};

export type SystemUpdateNotification = {
  type: "event_available";
  session_id: string;
  event_id: number;
  event_type: string;
};

export type SystemEvent = Record<string, unknown> & {
  type: string;
  session_id: string;
  event_id: number;
};
