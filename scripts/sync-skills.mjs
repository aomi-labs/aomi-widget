#!/usr/bin/env node

import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEST = path.resolve(ROOT, "packages/client/skills");

function parseSourceArg() {
  const index = process.argv.indexOf("--source");
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  const envSource = process.env.AOMI_SKILLS_SOURCE;
  if (envSource) {
    return envSource;
  }

  return "../skills";
}

async function main() {
  const source = path.resolve(ROOT, parseSourceArg());

  try {
    await access(source);
  } catch {
    throw new Error(`Skills source not found: ${source}`);
  }

  await rm(DEST, { recursive: true, force: true });
  await mkdir(path.dirname(DEST), { recursive: true });
  await cp(source, DEST, {
    recursive: true,
    force: true,
    filter: (src) => !src.split(path.sep).includes(".git"),
  });

  console.log(`Synced skills from ${source} to ${DEST}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
