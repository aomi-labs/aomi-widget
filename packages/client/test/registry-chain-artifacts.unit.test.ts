import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRegistryArtifact(path: string): string {
  const payload = JSON.parse(readFileSync(resolve(path), "utf8")) as {
    files?: Array<{ path?: string; content?: string }>;
  };
  return payload.files?.map((file) => file.content ?? "").join("\n") ?? "";
}

describe("registry chain artifacts", () => {
  it("publishes Monad in the installable Para provider", () => {
    const kitSource = readRegistryArtifact(
      "apps/landing/public/r/aomi-wallet-kit.json",
    );
    const providerSource = readRegistryArtifact(
      "apps/landing/public/r/aomi-para-provider.json",
    );

    expect(kitSource).toContain("monad");
    expect(kitSource).toContain("monadTestnet");
    expect(providerSource).toContain("supportedChains={supportedChains}");
  });
});
