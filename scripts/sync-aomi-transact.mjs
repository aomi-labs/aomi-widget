#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEST = path.resolve(ROOT, "packages/client/skills/aomi-transact/SKILL.md");

function parseSourceArg() {
  const index = process.argv.indexOf("--source");
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return process.env.AOMI_SKILLS_SOURCE ?? "../skills";
}

async function main() {
  const sourceRoot = path.resolve(ROOT, parseSourceArg());
  const sourceFile = path.join(sourceRoot, "aomi-transact", "SKILL.md");

  const content = await readFile(sourceFile, "utf8");
  await mkdir(path.dirname(DEST), { recursive: true });
  await writeFile(DEST, content, "utf8");

  console.log(`Synced ${path.relative(ROOT, sourceFile)} -> ${path.relative(ROOT, DEST)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
