import { describe, expect, it, vi } from "vitest";
import {
  createParaCredentialGetter,
  DISCONNECTED_PARA_ACCOUNT,
  resolveParaSubject,
} from "./para-auth";

vi.mock("@getpara/react-sdk", () => ({
  useAccount: vi.fn(),
  useClient: vi.fn(),
  useLogout: vi.fn(),
  useModal: vi.fn(),
}));

describe("createParaCredentialGetter", () => {
  it("issues a session JWT directly through the active Para client", async () => {
    const issueJwt = vi.fn(async () => ({
      token: "  signed-provider-token  ",
      keyId: "key-1",
    }));
    const getCredential = createParaCredentialGetter({ issueJwt });

    await expect(getCredential?.()).resolves.toEqual({
      provider: "para",
      tokenKind: "session_jwt",
      providerToken: "signed-provider-token",
      keyId: "key-1",
    });
    expect(issueJwt).toHaveBeenCalledOnce();
    expect(issueJwt).toHaveBeenCalledWith({});
  });

  it("returns no getter when the Para client is unavailable", () => {
    expect(createParaCredentialGetter(null)).toBeNull();
  });
});

describe("resolveParaSubject", () => {
  it("uses the embedded account user id exposed by current Para SDKs", () => {
    expect(
      resolveParaSubject(
        {
          ...DISCONNECTED_PARA_ACCOUNT,
          isConnected: true,
          embedded: { userId: "embedded-user" },
        },
        { userId: "client-user" },
      ),
    ).toBe("embedded-user");
  });

  it("falls back to ParaCore.userId for SDK account shapes without the id", () => {
    expect(
      resolveParaSubject(
        { ...DISCONNECTED_PARA_ACCOUNT, isConnected: true },
        { userId: "client-user" },
      ),
    ).toBe("client-user");
  });
});
