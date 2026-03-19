export type ParsedArgs = {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string>;
};

export type CliConfig = {
  baseUrl: string;
  apiKey?: string;
  app: string;
  model?: string;
  publicKey?: string;
  privateKey?: string;
  chainRpcUrl?: string;
  chain?: number;
};

export type CliRuntime = {
  parsed: ParsedArgs;
  config: CliConfig;
};
