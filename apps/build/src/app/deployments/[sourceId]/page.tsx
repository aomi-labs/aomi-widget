import { redirect } from "next/navigation";

function queryString(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "project") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export default async function ProjectRoute({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sourceId } = await params;
  const query = queryString(await searchParams);
  redirect(`/projects/${encodeURIComponent(sourceId)}${query ? `?${query}` : ""}`);
}
