#!/usr/bin/env node

import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

// Directory/file names that exist inside skill folders for local tooling only
// and must never be vendored into the public skills repo.
const LOCAL_ONLY_ENTRIES = new Set([
  ".git",
  ".skill-optimizer",
  "benchmark-results",
  "skill-optimizer",
  "node_modules",
]);

function parseArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return fallback;
}

async function requirePath(target, label) {
  try {
    await access(target);
  } catch {
    throw new Error(`${label} not found: ${target}`);
  }
}

async function clearDestination(destination) {
  const entries = await readdir(destination, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git") {
      continue;
    }

    await rm(path.join(destination, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

function shouldSkipEntry(name) {
  return LOCAL_ONLY_ENTRIES.has(name);
}

async function copySourceContents(source, destination) {
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    await cp(sourcePath, destinationPath, {
      recursive: true,
      force: true,
      filter: (candidate) => {
        // Exclude any local-only directory encountered anywhere in the tree.
        return !candidate.split(path.sep).some((segment) => shouldSkipEntry(segment));
      },
    });
  }
}

async function main() {
  const source = path.resolve(
    ROOT,
    parseArg("--source", process.env.AOMI_SKILLS_SOURCE ?? "packages/client/skills"),
  );
  const destinationArg = parseArg("--dest", process.env.AOMI_SKILLS_DEST);

  if (!destinationArg) {
    throw new Error("Destination path is required via --dest or AOMI_SKILLS_DEST.");
  }

  const destination = path.resolve(ROOT, destinationArg);

  await requirePath(source, "Skills source");
  await mkdir(destination, { recursive: true });
  await requirePath(path.join(destination, ".git"), "Skills destination git metadata");

  await clearDestination(destination);
  await copySourceContents(source, destination);

  console.log(
    `Published skills from ${path.relative(ROOT, source)} to ${path.relative(ROOT, destination)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
