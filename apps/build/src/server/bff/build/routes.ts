import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { authorize } from "@build/server/bff/auth";
import type {
  BuildRunDecisionRequest,
  CreateBuildRunRequest,
} from "@build/features/build/run-contracts";
import {
  BuildEngineError,
  cancelBuildRun,
  decideBuildRun,
  getBuildRun,
  readRunFile,
  reconstructBuildRun,
  snapshotBuildRun,
  startBuildRun,
  storedCrateTarball,
} from "./engine";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof BuildEngineError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("build run route failed:", error);
  return NextResponse.json({ error: "build engine error" }, { status: 500 });
}

const APP_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

export async function createBuildRunRoute(req: Request): Promise<NextResponse> {
  const auth = await authorize(req, { write: true, allowAnon: true });
  if ("response" in auth) return auth.response;

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
  if (
    body.builder !== undefined &&
    !["claude", "codex", "none"].includes(body.builder)
  ) {
    return NextResponse.json(
      { error: "builder must be claude, codex, or none" },
      { status: 400 },
    );
  }

  try {
    const handle = await startBuildRun({
      prompt,
      owner: auth.session?.githubLogin || "dev",
      app: body.app,
      autoApprove: body.autoApprove,
      builder: body.builder,
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
  const auth = await authorize(req, { allowAnon: true });
  if ("response" in auth) return auth.response;

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

/** Request cancellation — a durable store write the executing engine polls,
 *  so it works from any instance (and, later, for sandbox runners). */
export async function buildRunCancelRoute(req: Request): Promise<NextResponse> {
  const auth = await authorize(req, { write: true, allowAnon: true });
  if ("response" in auth) return auth.response;

  let body: { runId?: unknown };
  try {
    body = (await req.json()) as { runId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.runId !== "string") {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }
  try {
    await cancelBuildRun(body.runId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Stream the generated crate (apps/<app>) as a tarball. */
export async function buildRunDownloadRoute(
  req: Request,
): Promise<NextResponse | Response> {
  const auth = await authorize(req, { allowAnon: true });
  if ("response" in auth) return auth.response;

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
    // No local crate (sandbox runs — the crate lives in the sandbox's
    // filesystem): serve the artifact the result phase embedded in the store.
    try {
      const stored = await storedCrateTarball(handle);
      if (stored) {
        return new Response(new Uint8Array(stored), {
          headers: {
            "Content-Type": "application/gzip",
            "Content-Disposition": `attachment; filename="${handle.app}.tar.gz"`,
          },
        });
      }
    } catch (error) {
      console.error("stored crate read failed:", error);
    }
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

/** One generated-crate file (display path "<app>/src/tool.rs") — live disk,
 *  live sidecar, or the store's embedded tarball, whichever is freshest. */
export async function buildRunFileRoute(
  req: Request,
): Promise<NextResponse | Response> {
  const auth = await authorize(req, { allowAnon: true });
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const runId = url.searchParams.get("id");
  const filePath = url.searchParams.get("path");
  if (!runId || !filePath) {
    return NextResponse.json({ error: "missing id or path" }, { status: 400 });
  }
  const handle = getBuildRun(runId) ?? (await reconstructBuildRun(runId));
  if (!handle) {
    return NextResponse.json({ error: "unknown run" }, { status: 404 });
  }
  try {
    const body = await readRunFile(handle, filePath);
    if (!body) {
      return NextResponse.json({ error: "file not found" }, { status: 404 });
    }
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function buildRunDecisionRoute(
  req: Request,
): Promise<NextResponse> {
  const auth = await authorize(req, { write: true, allowAnon: true });
  if ("response" in auth) return auth.response;

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
