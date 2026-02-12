import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registry } from "../src/registry.js";

const REGISTRY_NAME = "aomi";
const REGISTRY_HOMEPAGE = "https://r.aomi.dev";

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(baseDir, "../dist");
const srcDir = path.resolve(baseDir, "../src");

function resolveFileType(filePath) {
  if (filePath.endsWith(".css")) return "registry:style";
  if (filePath.includes("/hooks/")) return "registry:hook";
  if (filePath.includes("/lib/")) return "registry:lib";
  return "registry:component";
}

function buildComponent(entry) {
  // Support single file (string) or multiple files (array)
  const filePaths = Array.isArray(entry.file) ? entry.file : [entry.file];

  const files = filePaths.map((f) => {
    const content = readFileSync(path.join(srcDir, f), "utf8");
    return { type: resolveFileType(f), path: f, content };
  });

  const payload = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: entry.name,
    type: entry.type ?? "registry:component",
    description: entry.description,
    files,
    dependencies: entry.dependencies ?? [],
    registryDependencies: entry.registryDependencies ?? [],
  };

  const outPath = path.join(distDir, `${entry.name}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  // Return item for registry.json (without content)
  return {
    name: entry.name,
    type: entry.type ?? "registry:component",
    description: entry.description,
    files: files.map(({ type, path: p }) => ({ type, path: p })),
    dependencies: entry.dependencies ?? [],
    registryDependencies: entry.registryDependencies ?? [],
  };
}

function main() {
  mkdirSync(distDir, { recursive: true });

  const items = registry.map(buildComponent);

  // Generate registry.json index
  const registryIndex = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: REGISTRY_NAME,
    homepage: REGISTRY_HOMEPAGE,
    items,
  };

  writeFileSync(
    path.join(distDir, "registry.json"),
    JSON.stringify(registryIndex, null, 2),
  );

  console.log(`Wrote ${items.length} component files + registry.json to dist/`);
}

main();
