import { source } from "@/lib/source";

// Strip top-of-file MDX `import`/`export` lines that plain markdown readers
// (and agents) treat as noise. Skips lines inside fenced code blocks and
// inside YAML frontmatter so real example code is preserved.
export function stripMdxImports(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let inFrontmatter = false;
  let frontmatterDone = false;
  let inFence = false;
  for (const line of lines) {
    if (!frontmatterDone) {
      if (line === "---") {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          inFrontmatter = false;
          frontmatterDone = true;
        }
        out.push(line);
        continue;
      }
      if (inFrontmatter) {
        out.push(line);
        continue;
      }
    }
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (!inFence) {
      if (/^\s*(import|export)\s.+from\s+['"]/.test(line)) continue;
      if (/^\s*(import|export)\s+['"]/.test(line)) continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

// Read a docs page (by slug array) as agent-friendly markdown:
// raw MDX with imports stripped, plus a `source:` line injected into frontmatter.
export async function readDocAsMarkdown(
  slug: string[],
): Promise<string | null> {
  const page = source.getPage(slug);
  if (!page) return null;
  const data = page.data as typeof page.data & {
    getText: (type: "raw" | "processed") => Promise<string>;
  };
  const raw = await data.getText("raw");
  return stripMdxImports(raw).replace(
    /^---\n/,
    `---\nsource: https://aomi.dev${page.url}\n`,
  );
}
