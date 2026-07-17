/**
 * Wire contracts between the /build page and the BFF build engine
 * (src/server/bff/build). Shared by client hooks and server routes, so no
 * server-only imports here.
 */

export type BuildRunStageStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "waiting";

export type BuildRunStage = {
  /** Stable workflow node id (`<app>:<phase>`). */
  id: string;
  label: string;
  kind:
    | "compute"
    | "agent"
    | "loop"
    | "approval"
    | "clarify"
    | "eval"
    | "parallel"
    | "wait-external";
  status: BuildRunStageStatus;
  /** Set on rows that are one branch of a parallel fan-out. */
  branchOf?: string;
  clarify?: {
    question: string;
    summary?: string;
    options: Array<{ key: string; label: string; summary?: string }>;
  };
};

export type BuildRunApproval = {
  nodeId: string;
  iteration: number;
  title?: string;
};

export type BuildRunStatus =
  | "running"
  | "waiting-approval"
  | "waiting-event"
  | "completed"
  | "failed";

export type BuildRunSnapshot = {
  runId: string;
  app: string;
  status: BuildRunStatus;
  stages: BuildRunStage[];
  approvals: BuildRunApproval[];
  /** Rolling tail of engine activity lines (already human-readable). */
  lines: string[];
  /** Final summary once the run settles. */
  result?: { status: string; summary: string };
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBuildRunRequest = {
  prompt: string;
  /** Simple package name; derived from the prompt when absent. */
  app?: string;
  /** Skip approval gates (defaults to true until the UI renders approvals). */
  autoApprove?: boolean;
};

export type CreateBuildRunResponse = {
  runId: string;
  app: string;
  stages: BuildRunStage[];
};

export type BuildRunDecisionRequest = {
  runId: string;
  nodeId: string;
  iteration: number;
  approve: boolean;
  note?: string;
  /** For select-mode clarifies. */
  selection?: { selected: string; notes?: string };
};
