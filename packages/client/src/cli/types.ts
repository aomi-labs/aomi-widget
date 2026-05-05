import type { AAMode } from "../aa/types";
import type { AomiPaymentMethod } from "../types";

export type CliExecutionMode = "aa" | "eoa";
export type CliAAProvider = "alchemy" | "pimlico";
export type CliAAMode = AAMode;

export type CliConfig = {
  baseUrl?: string;
  apiKey?: string;
  app?: string;
  model?: string;
  /** undefined = keep current/default, null = backend default/auto, value = force method. */
  paymentMethod?: AomiPaymentMethod | null;
  freshSession?: boolean;
  publicKey?: string;
  privateKey?: string;
  chainRpcUrl?: string;
  chain?: number;
  secrets: Record<string, string>;
  /** undefined = auto: use AA if provider configured, else EOA */
  execution?: CliExecutionMode;
  aaProvider?: CliAAProvider;
  aaMode?: CliAAMode;
};
