import { z } from "zod";
import { buildPlanSchema } from "./plan";

/**
 * Output tables for the Smithers run. One zod object per table; rows are keyed
 * by (runId, nodeId, iteration) and validated on write. Keep fields flat and
 * non-optional (empty string over null) — they map straight to SQLite columns.
 */
export const smitherSchemas = {
  input: buildPlanSchema,
  binaries: z.object({
    aomiBuild: z.string(),
    aomiRun: z.string(),
    sdkRoot: z.string(),
    source: z.string(),
    headSha: z.string(),
    syncAction: z.string(),
    warning: z.string(),
  }),
  codegen: z.object({
    ok: z.boolean(),
    log: z.string(),
  }),
  curation: z.object({
    summary: z.string(),
    changedFiles: z.string().default(""),
    followUps: z.string().default(""),
  }),
  review: z.object({
    approved: z.boolean(),
    notes: z.string().default(""),
  }),
  validation: z.object({
    green: z.boolean(),
    log: z.string(),
  }),
  fix: z.object({
    summary: z.string(),
  }),
  smoke: z.object({
    ok: z.boolean(),
    log: z.string(),
  }),
  /** Deploy approval decision — field names must match Smithers'
   *  approvalDecisionSchema so the engine can persist the decision. */
  gate: z.object({
    approved: z.boolean(),
    note: z.string().nullable(),
    decidedBy: z.string().nullable(),
    decidedAt: z.string().nullable(),
  }),
  deployment: z.object({
    ok: z.boolean(),
    log: z.string(),
  }),
  /** Clarify decision — a select-mode approval's `{selected, notes}` plus the
   *  engine's decidedBy/decidedAt stamps (mirrors how `gate` maps
   *  approvalDecisionSchema). */
  clarify: z.object({
    selected: z.string(),
    notes: z.string().nullable().default(null),
    decidedBy: z.string().nullable().default(null),
    decidedAt: z.string().nullable().default(null),
  }),
  /** Generic agent-phase report for the composed roles (research, draft-spec,
   *  synthesize) that don't have a bespoke table. */
  agentWork: z.object({
    summary: z.string(),
    artifacts: z.string().default(""),
    followUps: z.string().default(""),
  }),
  /** Behavioral eval result: the judge's score (0..1), pass/fail against the
   *  phase threshold, the judge's notes, and the run transcript it scored. */
  evaluation: z.object({
    score: z.number(),
    pass: z.boolean(),
    threshold: z.number(),
    notes: z.string().default(""),
    transcript: z.string().default(""),
  }),
  /** Payload of an external signal that resolves a wait-external pause. The
   *  Signal validates the incoming payload against this schema, so it doubles
   *  as the wait-external output row. `ready:false` lets an outside system
   *  report the work was abandoned. */
  external: z.object({
    ready: z.boolean(),
    note: z.string().default(""),
    receivedBy: z.string().default(""),
  }),
  result: z.object({
    status: z.enum(["complete", "deploy-denied", "blocked"]),
    summary: z.string(),
  }),
};

export type SmitherSchemas = typeof smitherSchemas;
export type BinariesRow = z.infer<SmitherSchemas["binaries"]>;
export type CodegenRow = z.infer<SmitherSchemas["codegen"]>;
export type CurationRow = z.infer<SmitherSchemas["curation"]>;
export type ReviewRow = z.infer<SmitherSchemas["review"]>;
export type ValidationRow = z.infer<SmitherSchemas["validation"]>;
export type SmokeRow = z.infer<SmitherSchemas["smoke"]>;
export type GateRow = z.infer<SmitherSchemas["gate"]>;
export type ClarifyRow = z.infer<SmitherSchemas["clarify"]>;
export type AgentWorkRow = z.infer<SmitherSchemas["agentWork"]>;
export type EvaluationRow = z.infer<SmitherSchemas["evaluation"]>;
export type ExternalRow = z.infer<SmitherSchemas["external"]>;
export type DeploymentRow = z.infer<SmitherSchemas["deployment"]>;
export type ResultRow = z.infer<SmitherSchemas["result"]>;

export function boundedLog(log: string, max = 4000): string {
  return log.length > max ? `${log.slice(0, max)}\n...truncated...` : log;
}
