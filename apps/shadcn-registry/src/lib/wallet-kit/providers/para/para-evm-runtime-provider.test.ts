import { describe, expect, it } from "vitest";
import { base } from "wagmi/chains";
import type ParaWeb from "@getpara/react-sdk";
import { createAomiParaEvmConfig } from "./para-evm-runtime-provider";

describe("Para EVM runtime", () => {
  it("mounts the Para connector in the wagmi config used for transaction signing", () => {
    const config = createAomiParaEvmConfig(
      { chains: [base], wallets: [] },
      {} as ParaWeb,
    );

    expect(config.connectors.some((connector) => connector.id === "para")).toBe(
      true,
    );
  });

  it("does not expose a disconnected Para connector without a Para client", () => {
    const config = createAomiParaEvmConfig(
      { chains: [base], wallets: [] },
      null,
    );

    expect(config.connectors.some((connector) => connector.id === "para")).toBe(
      false,
    );
  });
});
