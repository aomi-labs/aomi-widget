import { beforeEach, describe, expect, it, vi } from "vitest";

const capturePortalException = vi.hoisted(() => vi.fn());

vi.mock("@portal/server/bff/failures", () => ({
  portalFailures: {
    handle: (input: {
      error: unknown;
      upstream: string;
      context: Record<string, unknown>;
    }) =>
      capturePortalException(input.error, {
        ...input.context,
        upstream: input.upstream,
      }),
  },
}));
import {
  selectRegisteredRedirectUri,
  withRegisteredMcpRedirectUri,
} from "./oauth-redirect";

describe("MCP OAuth redirect URI preservation", () => {
  beforeEach(() => capturePortalException.mockReset());

  it("restores the registered loopback host when the auth stack normalizes redirect_uri", async () => {
    const request = new Request(
      "https://chat-staging.aomi.dev/api/auth/mcp/authorize?client_id=codex&redirect_uri=http%3A%2F%2Flocalhost%3A55633%2Fcallback%2FpZo_LEkWXZua&foo=http%3A%2F%2F127.0.0.1%3A1234%2Fx",
    );

    const corrected = await withRegisteredMcpRedirectUri(request, async () => [
      "http://127.0.0.1:55633/callback/pZo_LEkWXZua",
    ]);
    const url = new URL(corrected.url);

    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:55633/callback/pZo_LEkWXZua",
    );
    expect(url.searchParams.get("foo")).toBe("http://127.0.0.1:1234/x");
  });

  it("keeps an exact registered redirect URI unchanged", () => {
    expect(
      selectRegisteredRedirectUri("http://127.0.0.1:55633/callback/id", [
        "http://127.0.0.1:55633/callback/id",
      ]),
    ).toBe("http://127.0.0.1:55633/callback/id");
  });

  it("does not substitute a redirect URI with a different callback path", () => {
    expect(
      selectRegisteredRedirectUri("http://localhost:55633/callback/id", [
        "http://127.0.0.1:55633/callback/other",
      ]),
    ).toBeNull();
  });

  it("captures a redirect lookup failure once without exposing OAuth parameters", async () => {
    const failure = new Error("private database detail");
    const request = new Request(
      "https://portal.aomi.dev/api/auth/mcp/authorize?client_id=private-client&redirect_uri=http%3A%2F%2F127.0.0.1%3A55633%2Fcallback%2Fprivate",
    );

    const corrected = await withRegisteredMcpRedirectUri(request, async () => {
      throw failure;
    });

    expect(corrected).toBe(request);
    expect(capturePortalException).toHaveBeenCalledTimes(1);
    expect(capturePortalException).toHaveBeenCalledWith(failure, {
      routeFamily: "/api/auth/mcp/authorize",
      operation: "mcp_oauth_redirect_lookup",
      method: "GET",
      upstream: "supabase",
    });
    expect(JSON.stringify(capturePortalException.mock.calls)).not.toContain(
      "private-client",
    );
  });
});
