import { Suspense } from "react";
import { getPool } from "@aomi-labs/account";
import { McpConnectClient } from "./mcp-connect-client";

export const dynamic = "force-dynamic";

/** Display name of the requesting OAuth client (from dynamic registration). */
async function clientName(clientId: string | undefined): Promise<string | null> {
  if (!clientId) return null;
  try {
    const result = await getPool().query(
      "select name from ba_oauth_clients where client_id = $1 limit 1",
      [clientId],
    );
    return typeof result.rows[0]?.name === "string" ? result.rows[0].name : null;
  } catch {
    return null;
  }
}

export default async function McpConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const clientId =
    typeof params.client_id === "string" ? params.client_id : undefined;
  const name = await clientName(clientId);
  return (
    <Suspense
      fallback={
        <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">
              Connect to Aomi
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">Loading...</p>
          </section>
        </main>
      }
    >
      <McpConnectClient clientName={name} />
    </Suspense>
  );
}
