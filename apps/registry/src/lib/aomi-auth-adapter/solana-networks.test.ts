import { describe, expect, it } from "vitest";
import {
  normalizeSolanaNetworkOptions,
  resolveSelectedSolanaNetwork,
} from "./solana-networks";

describe("solana network resolution", () => {
  it("resolves the selected Solana network RPC endpoint", () => {
    const networks = normalizeSolanaNetworkOptions({
      networks: [
        {
          id: "solana-devnet",
          label: "Solana Devnet",
          cluster: "solana:devnet",
          rpcHttpUrl: "https://devnet.example",
          isDefault: true,
        },
        {
          id: "solana-mainnet",
          label: "Solana Mainnet",
          cluster: "solana:mainnet",
          rpcHttpUrl: "https://mainnet.example",
        },
      ],
    });

    const activeNetwork = resolveSelectedSolanaNetwork(
      networks,
      "solana-mainnet",
    );

    expect(activeNetwork.cluster).toBe("solana:mainnet");
    expect(activeNetwork.rpcHttpUrl).toBe("https://mainnet.example");
    expect(activeNetwork.id).toBe("solana-mainnet");
  });
});
