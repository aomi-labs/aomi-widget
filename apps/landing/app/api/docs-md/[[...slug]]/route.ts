import { source } from "@/lib/source";
import { readDocAsMarkdown } from "@/lib/agents-md";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return source.generateParams();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await params;
  const body = await readDocAsMarkdown(slug);

  if (body === null) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control":
        "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
