import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const file = path.join(process.cwd(), "content", "agents", "llms.txt");
  const body = await fs.readFile(file, "utf-8");
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
