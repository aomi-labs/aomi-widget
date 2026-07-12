import { describe, expect, it } from "vitest";
import {
  providerExchangeError,
  waitForProviderCredential,
} from "./provider-credential";

describe("waitForProviderCredential", () => {
  it("keeps polling until the provider exposes an exchangeable credential", async () => {
    const credential = { provider: "privy", providerToken: "token" };
    let calls = 0;

    await expect(
      waitForProviderCredential(
        () => {
          calls += 1;
          return calls < 3 ? null : credential;
        },
        { attemptTimeoutMs: 2, pollMs: 1, timeoutMs: 50 },
      ),
    ).resolves.toBe(credential);
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it("times out a provider credential promise that never resolves", async () => {
    await expect(
      waitForProviderCredential(() => new Promise(() => undefined), {
        attemptTimeoutMs: 2,
        pollMs: 1,
        timeoutMs: 12,
      }),
    ).rejects.toThrow("Provider did not return an exchangeable credential");
  });
});

describe("providerExchangeError", () => {
  it("surfaces the BFF response message instead of hiding it behind a status", async () => {
    const error = await providerExchangeError(
      new Response(JSON.stringify({ message: "already_linked" }), {
        status: 409,
      }),
    );

    expect(error.message).toBe("Provider exchange failed: already_linked");
  });
});
