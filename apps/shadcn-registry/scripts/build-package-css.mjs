import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, "src/package.css");
const themePath = resolve(root, "src/themes/default.css");
const outputPath = resolve(root, "package-dist/styles.css");
const source = await readFile(inputPath, "utf8");
const themeSource = await readFile(themePath, "utf8");
const result = await postcss([tailwindcss()]).process(source, {
  from: inputPath,
  to: outputPath,
});

// Preserve the Tailwind theme contract in the otherwise precompiled stylesheet.
// Tailwind consumers need these directives for host-side utilities such as
// `border-border`, while browsers without Tailwind safely ignore the directives
// and use the compiled CSS plus the ordinary custom properties below.
const lightThemeMarker =
  "/* ============================================\n   Light Theme";
const lightThemeIndex = themeSource.indexOf(lightThemeMarker);

if (lightThemeIndex === -1) {
  throw new Error(`Could not find the light-theme marker in ${themePath}`);
}

const tailwindThemeContract = themeSource.slice(0, lightThemeIndex).trim();
const packageCss = `${tailwindThemeContract}\n\n${result.css}`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, packageCss);
if (result.map) await writeFile(`${outputPath}.map`, result.map.toString());
