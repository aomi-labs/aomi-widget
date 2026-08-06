/**
 * Request-side wire helpers: body builders for the deploy backend
 * (camelCase input -> snake_case wire) and shared input validators.
 */
import { DeployError } from "../errors";
import type { ActivateInput, DeployInput, PreflightInput } from "../types";

export function deployRequest(
  input: DeployInput | PreflightInput,
  preflight: boolean,
): Record<string, unknown> {
  const projectId = Number(input.projectId);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new DeployError(
      "INVALID_REQUEST",
      "deploy requires a positive projectId",
    );
  }
  if (preflight) {
    // Preflight may omit `source_ref`; the backend resolves the default head.
    return {
      project_id: projectId,
      ...(input.sourceRef ? { source_ref: sourceRef(input.sourceRef) } : {}),
      preflight: true,
    };
  }
  // Apply always pins the exact preflight commit — reject a missing ref here
  // rather than letting an unpinned request reach the backend.
  return {
    project_id: projectId,
    source_ref: sourceRef(input.sourceRef),
  };
}

export function activateRequest(input: ActivateInput): Record<string, unknown> {
  const apps = cleanStringList(input.apps ?? [], "apps", true);
  const targetTags = cleanStringList(
    input.targetTags ?? [],
    "targetTags",
    true,
  );
  const target = releaseTagsTarget(input.target);
  const releaseTags = target.value as string[];
  if (apps.length > 0 && apps.length !== releaseTags.length) {
    throw new DeployError(
      "INVALID_REQUEST",
      "release_tags activation requires the same number of apps and release tags",
    );
  }
  return {
    target,
    ...(apps.length ? { apps } : {}),
    ...(targetTags.length ? { target_tags: targetTags } : {}),
  };
}

function sourceRef(ref: DeployInput["sourceRef"] | undefined): string {
  const clean = required(ref, "sourceRef");
  if (!/^[0-9a-f]{7,40}$/i.test(clean)) {
    throw new DeployError(
      "INVALID_REQUEST",
      "sourceRef must be a git commit SHA (7-40 hex chars)",
    );
  }
  return clean.toLowerCase();
}

function releaseTagsTarget(
  ref: ActivateInput["target"],
): Record<string, unknown> {
  if (ref.kind !== "release_tags") {
    throw new DeployError(
      "INVALID_REQUEST",
      "activation target.kind must be release_tags",
    );
  }
  return {
    kind: "release_tags",
    value: cleanStringList(ref.value, "target.value"),
  };
}

export function required(
  value: string | undefined | null,
  field: string,
): string {
  const clean = value?.trim();
  if (!clean) throw new DeployError("INVALID_REQUEST", `${field} is required`);
  return clean;
}

function cleanStringList(
  values: string[],
  field: string,
  allowEmpty = false,
): string[] {
  const clean = values.map((value) => value.trim()).filter(Boolean);
  if (!allowEmpty && clean.length === 0) {
    throw new DeployError(
      "INVALID_REQUEST",
      `${field} must contain at least one value`,
    );
  }
  return clean;
}

export function setDateRange(
  params: URLSearchParams,
  range: { fromDate?: string; toDate?: string },
): void {
  if (range.fromDate?.trim()) params.set("from_date", range.fromDate.trim());
  if (range.toDate?.trim()) params.set("to_date", range.toDate.trim());
}

/** Set `limit` only when it is a positive safe integer. */
export function setLimit(params: URLSearchParams, limit?: number): void {
  if (limit && Number.isSafeInteger(limit) && limit > 0) {
    params.set("limit", String(limit));
  }
}
