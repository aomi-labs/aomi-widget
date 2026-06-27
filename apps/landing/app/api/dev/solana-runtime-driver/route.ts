import { NextRequest, NextResponse } from "next/server";

type DriverReport = {
  runId: string;
  status: "idle" | "running" | "completed" | "failed";
  mode?: string;
  signer?: string;
  rpcUrl?: string;
  result?: unknown;
  error?: string | null;
  logs?: string[];
  updatedAt: string;
};

type DriverReportStore = Map<string, DriverReport>;

const driverReportGlobal = globalThis as typeof globalThis & {
  __AOMI_SOLANA_RUNTIME_DRIVER_REPORTS__?: DriverReportStore;
};

function getReportStore(): DriverReportStore {
  if (!driverReportGlobal.__AOMI_SOLANA_RUNTIME_DRIVER_REPORTS__) {
    driverReportGlobal.__AOMI_SOLANA_RUNTIME_DRIVER_REPORTS__ = new Map();
  }
  return driverReportGlobal.__AOMI_SOLANA_RUNTIME_DRIVER_REPORTS__;
}

function resolveNextStatus(
  previous: DriverReport["status"] | undefined,
  incoming: DriverReport["status"] | undefined,
): DriverReport["status"] {
  if (incoming === "completed" || incoming === "failed") {
    return incoming;
  }
  if (previous === "completed" || previous === "failed") {
    return previous;
  }
  return incoming ?? previous ?? "idle";
}

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  const store = getReportStore();

  if (!runId) {
    return NextResponse.json({
      runs: Array.from(store.values()),
    });
  }

  const report = store.get(runId);
  if (!report) {
    return NextResponse.json(
      {
        runId,
        status: "missing",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(report);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<DriverReport> & {
    runId?: string;
  };

  if (!body.runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const store = getReportStore();
  const previous = store.get(body.runId);
  const next: DriverReport = {
    runId: body.runId,
    status: resolveNextStatus(previous?.status, body.status),
    mode: body.mode ?? previous?.mode,
    signer: body.signer ?? previous?.signer,
    rpcUrl: body.rpcUrl ?? previous?.rpcUrl,
    result: body.result ?? previous?.result,
    error: body.error !== undefined ? body.error : previous?.error,
    logs: body.logs ?? previous?.logs,
    updatedAt: new Date().toISOString(),
  };

  store.set(body.runId, next);
  return NextResponse.json(next);
}
