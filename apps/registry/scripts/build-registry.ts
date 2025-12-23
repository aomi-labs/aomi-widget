import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { registry } from "../src/registry";

type RegistryFile = {
  path: string;
  content: string;
  type?: string;
};

type RegistryPayload = {
  name: string;
  files: RegistryFile[];
  dependencies?: string[];
  registryDependencies?: string[];
};

const registryRoot = path.resolve(__dirname, "..");
const srcDir = path.join(registryRoot, "src");
const distDir = path.join(registryRoot, "dist");

async function loadFile(relativePath: string): Promise<RegistryFile> {
  const fullPath = path.join(srcDir, relativePath);
  const content = await readFile(fullPath, "utf8");
  const type = relativePath.endsWith(".css") ? "style" : "registry:component";
  return { path: relativePath, content, type };
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const artifacts: RegistryPayload[] = [];

  for (const entry of registry) {
    const files = await Promise.all(entry.files.map((filePath) => loadFile(filePath)));
    const payload: RegistryPayload = {
      name: entry.name,
      files,
      dependencies: entry.dependencies,
      registryDependencies: entry.registryDependencies,
    };

    artifacts.push(payload);

    const outPath = path.join(distDir, `${entry.name}.json`);
    await writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");
  }

  const index = artifacts.map(({ name, files, dependencies, registryDependencies }) => ({
    name,
    files: files.map((file) => file.path),
    dependencies: dependencies ?? [],
    registryDependencies: registryDependencies ?? [],
  }));

  await writeFile(path.join(distDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
}

void build();
