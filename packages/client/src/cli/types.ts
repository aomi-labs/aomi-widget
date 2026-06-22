import type { AAMode } from "../aa/types";

export type CliExecutionMode = "aa" | "eoa";
export type CliAAProvider = "alchemy" | "pimlico";
export type CliAAMode = AAMode;
export type CliAccountProvider = "para" | "privy";

export type CliConfig = {
  baseUrl?: string;
  apiKey?: string;
  accountBearer?: string;
  accountProvider?: CliAccountProvider;
  accountProviderToken?: string;
  app?: string;
  model?: string;
  freshSession?: boolean;
  publicKey?: string;
  privateKey?: string;
  /**
   * Solana keypair secret. Accepts:
   *  - base58 of the 64-byte secret key (Phantom / Solflare export format)
   *  - JSON array of bytes (`[1,2,...,64]`, the `solana-keygen` format)
   * EVM-only sessions can leave this unset — `aomi tx sign` only requires it
   * when the targeted pending tx is `solana_sign` kind.
   */
  solanaPrivateKey?: string;
  /**
   * Solana cluster override. Accepts the short form used by the CLI
   * ("mainnet-beta", "devnet", "testnet") or the CAIP-2 form
   * ("solana:mainnet", "solana:devnet", "solana:testnet").
   * Defaults to "solana:mainnet" when a Solana address is present.
   */
  svmCluster?: "solana:mainnet" | "solana:devnet" | "solana:testnet";
  chainRpcUrl?: string;
  chain?: number;
  secrets: Record<string, string>;
  /** undefined = auto: use AA if provider configured, else EOA */
  execution?: CliExecutionMode;
  aaProvider?: CliAAProvider;
  aaMode?: CliAAMode;
};
