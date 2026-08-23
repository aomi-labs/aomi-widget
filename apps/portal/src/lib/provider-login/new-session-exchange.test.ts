import { describe, expect, it } from "vitest";
import {
  EXISTING_SESSION_PROVIDER_EXCHANGE_PATH,
  NEW_SESSION_PROVIDER_EXCHANGE_PATH,
} from "./new-session-exchange";

describe("provider exchange paths", () => {
  it("keeps sign-in and link on distinct URLs", () => {
    expect(NEW_SESSION_PROVIDER_EXCHANGE_PATH).toBe(
      "/api/auth/aomi/provider/exchange",
    );
    expect(EXISTING_SESSION_PROVIDER_EXCHANGE_PATH).toBe(
      "/api/aomi/provider/exchange",
    );
    expect(NEW_SESSION_PROVIDER_EXCHANGE_PATH).not.toBe(
      EXISTING_SESSION_PROVIDER_EXCHANGE_PATH,
    );
  });
});
