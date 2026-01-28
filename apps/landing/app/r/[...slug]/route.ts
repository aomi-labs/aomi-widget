import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const registryRoot = path.resolve(process.cwd(), "public", "r");
const registryRootPrefix = `${registryRoot}${path.sep}`;

type RouteParams = {
  slug: string[];
};

const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  const { slug } = await params;
  const segments = slug ?? [];
  if (segments.length === 0) {
    return notFound();
  }

  const resolved = path.resolve(registryRoot, ...segments);
  if (!resolved.startsWith(registryRootPrefix) || !resolved.endsWith(".json")) {
    return notFound();
  }

  try {
    const content = await readFile(resolved, "utf8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return notFound();
  }
}
