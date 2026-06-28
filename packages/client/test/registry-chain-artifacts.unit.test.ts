import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRegistryFile(path: string): string {
  const payload = JSON.parse(readFileSync(resolve(path), "utf8")) as {
    files?: Array<{ path?: string; content?: string }>;
  };
  return (
    payload.files?.find(
      (file) => file.path === "lib/auth-adapter/providers/para.tsx",
    )?.content ?? ""
  );
}

describe("registry chain artifacts", () => {
  it("publishes Monad in the installable Para provider", () => {
    const providerSource = readRegistryFile(
      "apps/landing/public/r/aomi-para-provider.json",
    );

    expect(providerSource).toContain("monad");
    expect(providerSource).toContain("monadTestnet");
    expect(providerSource).toContain("supportedChains={routing.routedChains}");
  });
});
