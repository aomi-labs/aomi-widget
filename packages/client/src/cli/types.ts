export type ParsedArgs = {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string>;
  secrets: Record<string, string>;
};

export type CliExecutionMode = "aa" | "eoa";
export type CliAAProvider = "alchemy" | "pimlico";
export type CliAAMode = "4337" | "7702";

export type CliConfig = {
  baseUrl: string;
  apiKey?: string;
  app: string;
  model?: string;
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

export type CliRuntime = {
  parsed: ParsedArgs;
  config: CliConfig;
};
