import {
  createPublicClient,
  http,
  verifyMessage as verifyEoaMessage,
  type Chain,
  type PublicClient,
} from "viem";
import {
  arbitrum,
  base,
  baseSepolia,
  linea,
  lineaSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";

export async function verifySiweMessage(input: {
  message: string;
  signature: string;
  address: string;
  chainId?: number | null;
}): Promise<boolean> {
  try {
    const eoaOk = await verifyEoaMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    if (eoaOk) return true;
  } catch {
    // Fall through to public-client verification for smart accounts.
  }

  const chainId = input.chainId ?? parseSiweChainId(input.message);
  if (!chainId) return false;
  const client = publicClientForChain(chainId);
  if (!client) return false;
  try {
    return await client.verifyMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

const VERIFY_CHAINS: readonly Chain[] = [
  mainnet,
  arbitrum,
  optimism,
  base,
  baseSepolia,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
];

const publicClients = new Map<number, PublicClient>();

function publicClientForChain(chainId: number): PublicClient | null {
  const existing = publicClients.get(chainId);
  if (existing) return existing;
  const chain = VERIFY_CHAINS.find((candidate) => candidate.id === chainId);
  if (!chain) return null;
  const client = createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  }) as PublicClient;
  publicClients.set(chainId, client);
  return client;
}

function parseSiweChainId(message: string): number | null {
  const match = message.match(/^Chain ID:\s*(\d+)\s*$/im);
  if (!match) return null;
  const chainId = Number(match[1]);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}
