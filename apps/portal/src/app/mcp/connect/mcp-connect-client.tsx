"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, RefreshCcw } from "lucide-react";
import { Button, useAomiAuthAdapter } from "@aomi-labs/widget-lib";

import { useAomiSession } from "@portal/components/aomi-session-bridge";

type McpToken = {
  access_token: string;
  token_type: "Bearer";
  expires_at: number;
  user_id: string;
};

const DEFAULT_MCP_URL =
  process.env.NEXT_PUBLIC_AOMI_MCP_URL?.trim() || "http://127.0.0.1:3010/mcp";

export function McpConnectClient() {
  const { status, retry } = useAomiSession();
  const adapter = useAomiAuthAdapter();
  const [mcpUrl, setMcpUrl] = useState(DEFAULT_MCP_URL);
  const [token, setToken] = useState<McpToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopied(null);
    try {
      const response = await fetch("/api/mcp/token", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | Partial<McpToken>
        | { error?: string }
        | null;
      if (!response.ok) {
        const message =
          body && "error" in body && typeof body.error === "string"
            ? body.error
            : "Could not create MCP token";
        throw new Error(message);
      }
      if (
        !body ||
        !("access_token" in body) ||
        !body.access_token ||
        !("expires_at" in body) ||
        typeof body.expires_at !== "number" ||
        !("user_id" in body) ||
        !body.user_id
      ) {
        throw new Error("MCP token response was incomplete");
      }
      setToken({
        access_token: body.access_token,
        token_type: "Bearer",
        expires_at: body.expires_at,
        user_id: body.user_id,
      });
    } catch (err) {
      setToken(null);
      setError(
        err instanceof Error ? err.message : "Could not create MCP token",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "ready" && !token && !loading) {
      void refreshToken();
    }
  }, [status, token, loading, refreshToken]);

  const expiresAt = useMemo(() => {
    if (!token) return null;
    return new Date(token.expires_at * 1000).toLocaleString();
  }, [token]);

  const configJson = useMemo(() => {
    if (!token) return "";
    return JSON.stringify(
      {
        mcpServers: {
          aomi: {
            type: "http",
            url: mcpUrl,
            headers: {
              Authorization: `${token.token_type} ${token.access_token}`,
            },
          },
        },
      },
      null,
      2,
    );
  }, [mcpUrl, token]);

  const copy = useCallback(async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => {
      setCopied((current) => (current === label ? null : current));
    }, 1600);
  }, []);

  const connectAccount = useCallback(() => {
    if (adapter.identity.isConnected && adapter.openAccountUI) {
      void adapter.openAccountUI();
      return;
    }
    void adapter.connect();
  }, [adapter]);

  return (
    <main className="bg-background text-foreground flex min-h-screen w-full overflow-y-auto px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-muted-foreground text-sm font-medium">Aomi MCP</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Connect Claude to Aomi
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            Sign in with your Aomi account, mint a short-lived MCP bearer, then
            use it as the Authorization header for the remote MCP server.
          </p>
        </header>

        <section className="border-border bg-card space-y-5 rounded-lg border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-medium">Account</h2>
              <p className="text-muted-foreground text-sm">
                {status === "ready"
                  ? "Your portal session is ready."
                  : status === "establishing"
                    ? "Finishing account setup..."
                    : status === "error"
                      ? "Account setup needs attention."
                      : "Sign in before creating an MCP bearer."}
              </p>
            </div>
            {status !== "ready" && (
              <div className="flex gap-2">
                {status === "error" && (
                  <Button type="button" variant="outline" onClick={retry}>
                    Retry
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={connectAccount}
                  disabled={!adapter.canConnect && !adapter.canOpenAccountUI}
                >
                  {adapter.identity.isConnected ? "Manage Account" : "Sign In"}
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="border-border bg-card space-y-5 rounded-lg border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-2">
              <span className="text-sm font-medium">MCP server URL</span>
              <input
                value={mcpUrl}
                onChange={(event) => setMcpUrl(event.target.value)}
                className="border-input bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshToken()}
              disabled={status !== "ready" || loading}
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>

          {status === "ready" && loading && (
            <p className="text-muted-foreground text-sm">
              Creating MCP bearer...
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          {token && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-4 text-sm">
                <p className="font-medium">Bearer ready</p>
                <p className="text-muted-foreground mt-1">
                  User: {token.user_id}
                </p>
                {expiresAt && (
                  <p className="text-muted-foreground">Expires: {expiresAt}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    void copy(
                      "header",
                      `${token.token_type} ${token.access_token}`,
                    )
                  }
                >
                  {copied === "header" ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <Copy className="mr-2 size-4" />
                  )}
                  Copy Header
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copy("config", configJson)}
                >
                  {copied === "config" ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <Copy className="mr-2 size-4" />
                  )}
                  Copy Config JSON
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
