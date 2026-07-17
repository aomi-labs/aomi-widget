export type SiwsChainId = "solana:mainnet" | "solana:devnet" | "solana:testnet";

export type SiwsIntent = "sign-in" | "link";

export function buildSiwsMessage(input: {
  address: string;
  chainId: SiwsChainId;
  nonce: string;
  intent: SiwsIntent;
  domain: string;
  uri: string;
  issuedAt?: Date;
}): string {
  const action = input.intent === "link" ? "link" : "sign in with";
  const statement =
    input.intent === "link"
      ? "Only sign this message if you want this Solana wallet attached to the current Aomi account."
      : "Sign in to Aomi.";
  return `${input.domain} wants you to ${action} your Solana account:
${input.address}

${statement}

URI: ${input.uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${(input.issuedAt ?? new Date()).toISOString()}`;
}
