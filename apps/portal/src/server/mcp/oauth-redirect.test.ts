import { describe, expect, it } from "vitest";
import {
  selectRegisteredRedirectUri,
  withRegisteredMcpRedirectUri,
} from "./oauth-redirect";

describe("MCP OAuth redirect URI preservation", () => {
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
});
