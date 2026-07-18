import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { validateOrigin } from "@build/lib/csrf";
import { checkRateLimit, getClientIp } from "@build/lib/rate-limit";
import { getGitHubSession } from "@build/server/cookies/github";
import type {
  BuildRunDecisionRequest,
  CreateBuildRunRequest,
} from "@build/features/build/run-contracts";
import {
  BuildEngineError,
  decideBuildRun,
  getBuildRun,
  reconstructBuildRun,
  snapshotBuildRun,
  startBuildRun,
} from "./engine";

function rateLimited(req: Request): NextResponse | null {
  return checkRateLimit(getClientIp(req)).allowed
    ? null
    : NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

/** Rate limit + same-origin check for mutating routes. */
function checkWrite(req: Request): NextResponse | null {
  const limited = rateLimited(req);
  if (limited) return limited;
  return validateOrigin(req)
    ? null
    : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Build runs execute agents and shell commands server-side; a signed-in
 *  session is required, same as the deploy routes. AOMI_BUILD_ALLOW_ANON=1
 *  waives it for local testing — dev builds only, never production. */
async function requireSession(): Promise<NextResponse | null> {
  if (
    process.env.AOMI_BUILD_ALLOW_ANON === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return null;
  }
  if (await getGitHubSession()) return null;
  return NextResponse.json(
    { error: "not signed in with GitHub" },
    { status: 401 },
  );
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof BuildEngineError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("build run route failed:", error);
  return NextResponse.json({ error: "build engine error" }, { status: 500 });
}

const APP_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

export async function createBuildRunRoute(req: Request): Promise<NextResponse> {
  const blocked = checkWrite(req);
  if (blocked) return blocked;
  const denied = await requireSession();
  if (denied) return denied;

  let body: CreateBuildRunRequest;
  try {
    body = (await req.json()) as CreateBuildRunRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 4000) {
    return NextResponse.json(
      { error: "prompt must be 1–4000 characters" },
      { status: 400 },
    );
  }
  if (body.app !== undefined && !APP_NAME.test(body.app)) {
    return NextResponse.json(
      { error: "app must match [a-zA-Z0-9_-]{1,64}" },
      { status: 400 },
    );
  }

  try {
    const handle = await startBuildRun({
      prompt,
      app: body.app,
      autoApprove: body.autoApprove,
    });
    const snapshot = await snapshotBuildRun(handle);
    return NextResponse.json({
      runId: snapshot.runId,
      app: snapshot.app,
      stages: snapshot.stages,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function buildRunStatusRoute(req: Request): Promise<NextResponse> {
  const limited = rateLimited(req);
  if (limited) return limited;
  const denied = await requireSession();
  if (denied) return denied;

  const runId = new URL(req.url).searchParams.get("id");
  if (!runId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  // Registry miss ≠ unknown run: another instance (or a past process life)
  // may own it — reconstruct an observer handle from the durable store.
  const handle = getBuildRun(runId) ?? (await reconstructBuildRun(runId));
  if (!handle) {
    return NextResponse.json({ error: "unknown run" }, { status: 404 });
  }
  return NextResponse.json(await snapshotBuildRun(handle));
}

/** Stream the generated crate (apps/<app>) as a tarball. */
export async function buildRunDownloadRoute(
  req: Request,
): Promise<NextResponse | Response> {
  const limited = rateLimited(req);
  if (limited) return limited;
  const denied = await requireSession();
  if (denied) return denied;

  const runId = new URL(req.url).searchParams.get("id");
  if (!runId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const handle = getBuildRun(runId) ?? (await reconstructBuildRun(runId));
  if (!handle) {
    return NextResponse.json({ error: "unknown run" }, { status: 404 });
  }
  const appsDir = path.join(handle.plan.sdkRoot, "apps");
  if (!existsSync(path.join(appsDir, handle.app))) {
    return NextResponse.json(
      { error: "no generated crate yet — run the build first" },
      { status: 409 },
    );
  }
  // Stream `tar` directly; the crate is small (target/ excluded).
  const tar = spawn("tar", [
    "-cz",
    "--exclude",
    "target",
    "--exclude",
    "Cargo.lock",
    "-C",
    appsDir,
    handle.app,
  ]);
  tar.on("error", (error) => console.error("crate tar failed:", error));
  return new Response(Readable.toWeb(tar.stdout) as ReadableStream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${handle.app}.tar.gz"`,
    },
  });
}

export async function buildRunDecisionRoute(
  req: Request,
): Promise<NextResponse> {
  const blocked = checkWrite(req);
  if (blocked) return blocked;
  const denied = await requireSession();
  if (denied) return denied;

  let body: BuildRunDecisionRequest;
  try {
    body = (await req.json()) as BuildRunDecisionRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.runId !== "string" ||
    typeof body.nodeId !== "string" ||
    !Number.isSafeInteger(body.iteration) ||
    body.iteration < 0 ||
    typeof body.approve !== "boolean"
  ) {
    return NextResponse.json(
      { error: "runId, nodeId, iteration, approve are required" },
      { status: 400 },
    );
  }

  try {
    await decideBuildRun({
      runId: body.runId,
      nodeId: body.nodeId,
      iteration: body.iteration,
      approve: body.approve,
      note: body.note,
      selection: body.selection,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
