import { gunzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const input = process.argv.slice(2).find((argument) => argument !== "--");

if (!input) {
  throw new Error(
    "Usage: node scripts/extract-v3-reference.mjs /path/to/Aomi-Landing-v3.html",
  );
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, "../public/assets/v3/reference");
const assetDir = path.join(outputDir, "assets");
const navigationDir = path.join(scriptDir, "v3-reference");

const source = await readFile(path.resolve(input), "utf8");
const navigation = JSON.parse(
  await readFile(path.join(navigationDir, "navigation.json"), "utf8"),
);
const faq = JSON.parse(
  await readFile(path.join(navigationDir, "faq.json"), "utf8"),
);

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const navigationMenus = Object.entries(navigation)
  .map(([label, items]) => {
    const links = items
      .map(
        (item) =>
          `<a href="${escapeHtml(item.href)}" class="v3-reference-nav-menu-item" role="menuitem"${item.external ? ' target="_blank" rel="noreferrer"' : ""}><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.description)}</small></a>`,
      )
      .join("");

    return `<div class="v3-reference-nav-menu" data-v3-menu="${escapeHtml(label)}" role="menu" aria-label="${escapeHtml(label)}" aria-hidden="true" style="display:none"><div class="v3-reference-nav-menu-grid">${links}</div></div>`;
  })
  .join("");

function readBundleJson(type) {
  const match = source.match(
    new RegExp(`<script type="${type}">\\s*([\\s\\S]*?)\\s*<\\/script>`),
  );

  if (!match) {
    throw new Error(`Missing ${type} block in ${input}`);
  }

  return JSON.parse(match[1]);
}

const manifest = readBundleJson("__bundler/manifest");
const externalResources = readBundleJson("__bundler/ext_resources");
let template = readBundleJson("__bundler/template");

const extensions = new Map([
  ["application/javascript", "js"],
  ["font/otf", "otf"],
  ["font/ttf", "ttf"],
  ["font/woff", "woff"],
  ["font/woff2", "woff2"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/svg+xml", "svg"],
  ["image/webp", "webp"],
  ["text/css", "css"],
  ["text/javascript", "js"],
]);

await mkdir(assetDir, { recursive: true });

const assetPaths = new Map();

for (const [uuid, entry] of Object.entries(manifest)) {
  const extension = extensions.get(entry.mime) ?? "bin";
  const relativePath = `./assets/${uuid}.${extension}`;
  const target = path.join(assetDir, `${uuid}.${extension}`);
  const packed = Buffer.from(entry.data, "base64");
  const bytes = entry.compressed ? gunzipSync(packed) : packed;

  await writeFile(target, bytes);
  assetPaths.set(uuid, relativePath);
  template = template.split(uuid).join(relativePath);
}

const resources = Object.fromEntries(
  externalResources.flatMap(({ id, uuid }) => {
    const assetPath = assetPaths.get(uuid);
    return assetPath ? [[id, assetPath]] : [];
  }),
);

const componentMatch = template.match(
  /<script type="text\/x-dc"([^>]*data-dc-script[^>]*)>([\s\S]*?)<\/script>/,
);

if (!componentMatch) {
  throw new Error("Reference template is missing its component state machine");
}

const faqSource = JSON.stringify(
  faq.items.map(({ question, answer }) => ({ q: question, a: answer })),
  null,
  6,
);
const faqPattern =
  /(faqVals\(\) \{\s*const data = )\[[\s\S]*?\](;\s*const open)/;
let componentSource = componentMatch[2];

if (!faqPattern.test(componentSource)) {
  throw new Error("Reference component is missing its FAQ data block");
}

componentSource = componentSource.replace(
  faqPattern,
  (_, prefix, suffix) => `${prefix}${faqSource}${suffix}`,
);
const componentTag = `<script type="text/x-dc" id="aomi-v3-component"${componentMatch[1]}><\/script><script src="./component-source.js"><\/script>`;
template = template.replace(componentMatch[0], componentTag);
template = template.replace(
  /(<section data-screen-label="FAQ"[\s\S]*?<h2\b[^>]*>)[\s\S]*?(<\/h2>)/,
  `$1${escapeHtml(faq.heading)}$2`,
);
template = template.replace(
  /(<section data-screen-label="FAQ"[\s\S]*?<sc-for list="\{\{faqs\}\}" as="f" hint-placeholder-count=")\d+(">)/,
  `$1${faq.items.length}$2`,
);
template = template.replace(
  /(<nav\b[\s\S]*?)(<\/nav>)/,
  `$1${navigationMenus}$2`,
);

const resourceScript = `<base href="/assets/v3/reference/"><title>Aomi — Execution harness for onchain finance<\/title><link rel="icon" href="/assets/images/bubble.svg"><link rel="stylesheet" href="./atmosphere.css"><link rel="stylesheet" href="./navigation.css"><script src="./resources.js"><\/script><script src="./atmosphere.js" defer><\/script><script src="./navigation.js" defer><\/script>`;
const head = template.match(/<head[^>]*>/i);

if (!head || head.index === undefined) {
  throw new Error("Reference template is missing <head>");
}

const insertion = head.index + head[0].length;
template =
  template.slice(0, insertion) + resourceScript + template.slice(insertion);

await writeFile(
  path.join(outputDir, "resources.js"),
  `window.__resources = ${JSON.stringify(resources, null, 2)};\n`,
);
await writeFile(
  path.join(outputDir, "component-source.js"),
  `document.getElementById("aomi-v3-component").textContent = ${JSON.stringify(componentSource)};\n`,
);
await writeFile(
  path.join(outputDir, "navigation.css"),
  await readFile(path.join(navigationDir, "navigation.css"), "utf8"),
);
await writeFile(
  path.join(outputDir, "navigation.js"),
  await readFile(path.join(navigationDir, "navigation.js"), "utf8"),
);
await writeFile(
  path.join(outputDir, "atmosphere.css"),
  await readFile(path.join(navigationDir, "atmosphere.css"), "utf8"),
);
await writeFile(
  path.join(outputDir, "atmosphere.js"),
  await readFile(path.join(navigationDir, "atmosphere.js"), "utf8"),
);
await writeFile(path.join(outputDir, "index.html"), template);

const sourceBytes = Buffer.byteLength(source);
const htmlBytes = Buffer.byteLength(template);

console.log(
  JSON.stringify(
    {
      source: path.resolve(input),
      output: outputDir,
      assets: assetPaths.size,
      sourceBytes,
      htmlBytes,
      htmlReduction: `${Math.round((1 - htmlBytes / sourceBytes) * 100)}%`,
    },
    null,
    2,
  ),
);
