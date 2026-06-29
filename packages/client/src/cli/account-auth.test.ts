import { describe, expect, it, vi } from "vitest";

import { siweLogin } from "./account-auth";

// A funded hardhat test key — only used to sign an in-process SIWE message.
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

type FakeResponseInit = {
  ok?: boolean;
  status?: number;
  json?: unknown;
  setCookie?: string;
};

function fakeResponse(init: FakeResponseInit): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => init.json,
    text: async () => JSON.stringify(init.json ?? ""),
    headers: {
      getSetCookie: () => (init.setCookie ? [init.setCookie] : []),
      get: () => null,
    },
  } as unknown as Response;
}

describe("siweLogin", () => {
  it("runs nonce → sign → verify and returns the aomi_session token", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ json: { nonce: "abc123def456" } }))
      .mockResolvedValueOnce(
        fakeResponse({
          json: { ok: true, user_id: "u1" },
          setCookie: "aomi_session=SESSION_JWT; Path=/; HttpOnly",
        }),
      );

    const result = await siweLogin({
      baseUrl: "https://bff.aomi.dev",
      privateKey: TEST_PRIVATE_KEY,
      chainId: 8453,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.sessionCookie).toBe("SESSION_JWT");
    expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);

    // nonce GET then verify POST, both against the BFF origin.
    const [nonceUrl] = fetchImpl.mock.calls[0];
    const [verifyUrl, verifyInit] = fetchImpl.mock.calls[1];
    expect(nonceUrl).toBe("https://bff.aomi.dev/api/bff/auth/siwe/nonce");
    expect(verifyUrl).toBe("https://bff.aomi.dev/api/bff/auth/siwe/verify");
    // The single-use nonce is replayed as the cookie the verify route expects.
    expect(verifyInit.headers.Cookie).toBe("aomi_siwe_nonce=abc123def456");
    const body = JSON.parse(verifyInit.body);
    expect(typeof body.message).toBe("string");
    expect(body.signature).toMatch(/^0x/);
  });

  it("throws when verify succeeds but sets no session cookie", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ json: { nonce: "noncevalue1234" } }))
      .mockResolvedValueOnce(fakeResponse({ json: { ok: true } }));

    await expect(
      siweLogin({
        baseUrl: "https://bff.aomi.dev",
        privateKey: TEST_PRIVATE_KEY,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/no aomi_session cookie/);
  });
});
