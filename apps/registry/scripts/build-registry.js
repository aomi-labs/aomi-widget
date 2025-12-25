import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registry } from "../src/registry";

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(baseDir, "../dist");
const srcDir = path.resolve(baseDir, "../src");

function buildComponent(entry) {
  const filePath = path.join(srcDir, entry.file);
  const content = readFileSync(filePath, "utf8");

  const payload = {
    name: entry.name,
    type: "registry:ui",
    description: entry.description,
    files: [
      {
        path: entry.file,
        content,
      },
    ],
    dependencies: entry.dependencies ?? [],
    registryDependencies: entry.registryDependencies ?? [],
  };

  const outPath = path.join(distDir, `${entry.name}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  return { name: entry.name, path: outPath };
}

function main() {
  mkdirSync(distDir, { recursive: true });
  const index = registry.map(buildComponent);
  writeFileSync(path.join(distDir, "index.json"), JSON.stringify(index, null, 2));
  console.log(`Wrote ${index.length} registry files to dist/`);
}

main();
