import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, "src/package.css");
const outputPath = resolve(root, "package-dist/styles.css");
const source = await readFile(inputPath, "utf8");
const result = await postcss([tailwindcss()]).process(source, {
  from: inputPath,
  to: outputPath,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, result.css);
if (result.map) await writeFile(`${outputPath}.map`, result.map.toString());
