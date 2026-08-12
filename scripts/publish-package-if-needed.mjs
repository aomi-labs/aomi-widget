#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_REGISTRY_URL = "https://registry.npmjs.org";

export async function publishPackageIfNeeded(
  packageDirectory,
  {
    fetchImpl = globalThis.fetch,
    publishImpl = publishWithNpm,
    registryUrl = process.env.NPM_CONFIG_REGISTRY ??
      process.env.npm_config_registry ??
      DEFAULT_REGISTRY_URL,
  } = {},
) {
  const manifestPath = path.resolve(packageDirectory, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const packageSpec = `${manifest.name}@${manifest.version}`;
  const versionUrl = [
    registryUrl.replace(/\/+$/, ""),
    encodeURIComponent(manifest.name).replace(/^%40/, "@"),
    encodeURIComponent(manifest.version),
  ].join("/");
  const isPublished = () =>
    checkPublishedVersion({ fetchImpl, packageSpec, versionUrl });

  if (await isPublished()) {
    console.log(`${packageSpec} is already published; skipping.`);
    return "skipped";
  }

  console.log(`${packageSpec} is not published; publishing now.`);
  try {
    await publishImpl(packageDirectory);
  } catch (error) {
    // A concurrent run may publish after our initial 404, or npm may accept a
    // PUT but return a transient error. Treat the package's durable registry
    // state as authoritative before failing the job.
    if (await isPublished()) {
      console.log(`${packageSpec} is now published; continuing.`);
      return "published";
    }
    throw error;
  }
  return "published";
}

async function checkPublishedVersion({ fetchImpl, packageSpec, versionUrl }) {
  let response;
  try {
    response = await fetchImpl(versionUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(
      `Could not check whether ${packageSpec} is published: ${error instanceof Error ? error.message : error}`,
    );
  }

  if (response.ok) return true;
  if (response.status === 404) return false;

  const detail = (await response.text()).trim().slice(0, 500);
  throw new Error(
    `Registry check for ${packageSpec} failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
  );
}

function publishWithNpm(packageDirectory) {
  return new Promise((resolve, reject) => {
    const args = ["publish", "--access", "public"];
    const distTag = process.env.NPM_DIST_TAG?.trim();
    if (distTag) args.push("--tag", distTag);
    const child = spawn("npm", args, {
      cwd: path.resolve(packageDirectory),
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `npm publish for ${packageDirectory} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}

async function main() {
  const packageDirectory = process.argv[2];
  if (!packageDirectory) {
    throw new Error(
      "Usage: node scripts/publish-package-if-needed.mjs <package-directory>",
    );
  }
  await publishPackageIfNeeded(packageDirectory);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
