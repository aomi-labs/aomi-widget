#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const args = process.argv.slice(2);

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const port = Number(getArg("port", "3003"));
const mode = getArg("mode", "send_fallback");
const timeoutMs = Number(getArg("timeout-ms", "120000"));
const shouldStart = !hasFlag("no-start");
const shouldOpen = !hasFlag("no-open");

const baseUrl = `http://127.0.0.1:${port}`;
const tmpDir = path.join(cwd, ".tmp");
const devLogPath = path.join(tmpDir, `landing-${port}.log`);
const pidPath = path.join(tmpDir, `landing-${port}.pid`);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function isReady() {
  try {
    const response = await fetch(baseUrl, {
      redirect: "manual",
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: process.env,
      stdio: "inherit",
      ...options,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`${command} ${commandArgs.join(" ")} exited with ${code}`),
      );
    });
  });
}

async function ensurePackagesBuilt() {
  await runCommand("pnpm", ["--filter", "@aomi-labs/client", "build"]);
  await runCommand("pnpm", ["--filter", "@aomi-labs/react", "build"]);
}

async function startLandingServer() {
  fs.mkdirSync(tmpDir, { recursive: true });
  const out = fs.openSync(devLogPath, "a");
  const child = spawn(
    "pnpm",
    [
      "--filter",
      "landing",
      "exec",
      "next",
      "dev",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(port),
    ],
    {
      cwd,
      env: process.env,
      detached: true,
      stdio: ["ignore", out, out],
    },
  );

  child.unref();
  fs.writeFileSync(pidPath, `${child.pid}\n`, "utf8");
  console.log(`landing dev started on ${baseUrl}`);
  console.log(`log: ${devLogPath}`);
  console.log(`pid: ${child.pid}`);
}

async function waitForReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReady()) {
      return;
    }
    await sleep(1000);
  }
  throw new Error(`landing app did not become ready on ${baseUrl}`);
}

function openUrl(url) {
  const launcher =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const launcherArgs =
    process.platform === "win32" ? ["/c", "start", "", url] : [url];

  try {
    const child = spawn(launcher, launcherArgs, {
      cwd,
      env: process.env,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (error) {
    console.warn(`failed to open browser automatically: ${error}`);
  }
}

async function pollReport(runId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const report = await fetchJson(
        `${baseUrl}/api/dev/solana-runtime-driver?runId=${runId}`,
      );

      if (report.status === "completed" || report.status === "failed") {
        return report;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("HTTP 404")) {
        console.log(`waiting for report: ${message}`);
      }
    }

    await sleep(1000);
  }

  throw new Error(`timed out waiting for run report after ${timeoutMs}ms`);
}

async function main() {
  if (!(await isReady())) {
    if (!shouldStart) {
      throw new Error(`${baseUrl} is not ready and --no-start was supplied`);
    }
    await ensurePackagesBuilt();
    await startLandingServer();
    await waitForReady();
  }

  const runId = `solana-driver-${Date.now()}`;
  const driverUrl =
    `${baseUrl}/dev/solana-runtime-driver` +
    `?autorun=1&mode=${encodeURIComponent(mode)}&runId=${encodeURIComponent(runId)}`;

  console.log(`driver mode: ${mode}`);
  console.log(`driver url: ${driverUrl}`);

  if (shouldOpen) {
    openUrl(driverUrl);
  } else {
    console.log("browser auto-open disabled");
  }

  const report = await pollReport(runId);
  console.log(JSON.stringify(report, null, 2));

  if (report.status !== "completed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
