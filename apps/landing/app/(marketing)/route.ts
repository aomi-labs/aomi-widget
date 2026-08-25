import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";
export const runtime = "nodejs";

const homePath = path.join(
  process.cwd(),
  "public",
  "assets",
  "landing",
  "home",
  "index.html",
);

export async function GET() {
  const html = await readFile(homePath, "utf8");

  return new Response(html, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
