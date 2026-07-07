import {
  createPublicClient,
  http,
  recoverMessageAddress,
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
  let eoaError: unknown;
  try {
    const eoaOk = await verifyEoaMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    if (eoaOk) return true;
  } catch (error) {
    eoaError = error;
    // Fall through to public-client verification for smart accounts.
  }

  const chainId = input.chainId ?? parseSiweChainId(input.message);
  if (!chainId) {
    await logInvalidSiweMessage(input, { eoaError, reason: "missing_chain" });
    return false;
  }
  const client = publicClientForChain(chainId);
  if (!client) {
    await logInvalidSiweMessage(input, { eoaError, reason: "unsupported_chain" });
    return false;
  }
  try {
    const smartAccountOk = await client.verifyMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    if (smartAccountOk) return true;
  } catch (error) {
    await logInvalidSiweMessage(input, {
      eoaError,
      smartAccountError: error,
      reason: "signature_mismatch",
    });
    return false;
  }
  await logInvalidSiweMessage(input, { eoaError, reason: "signature_mismatch" });
  return false;
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

// Per-chain RPC override read from env. Smart-account (EIP-1271 / ERC-6492)
// verification does a heavy *deployless* `eth_call` (it counterfactually deploys
// the wallet, then calls `isValidSignature`). Keyless public RPCs — notably
// viem's mainnet default `eth.merkle.io` — frequently time out on this call,
// which makes Coinbase Smart Wallet / Base Account SIWE logins appear to hang
// (the EOA path short-circuits, so MetaMask/Rabby are unaffected). Point these
// at a real RPC (Alchemy/Infura/etc.) so the on-chain check resolves.
const RPC_ENV_BY_CHAIN: Record<number, readonly string[]> = {
  [mainnet.id]: ["MAINNET_RPC_URL", "ETH_RPC_URL"],
  [base.id]: ["BASE_RPC_URL"],
  [baseSepolia.id]: ["BASE_SEPOLIA_RPC_URL"],
  [arbitrum.id]: ["ARBITRUM_RPC_URL"],
  [optimism.id]: ["OPTIMISM_RPC_URL"],
  [polygon.id]: ["POLYGON_RPC_URL"],
  [sepolia.id]: ["SEPOLIA_RPC_URL"],
  [linea.id]: ["LINEA_RPC_URL"],
  [lineaSepolia.id]: ["LINEA_SEPOLIA_RPC_URL"],
};

function rpcUrlForChain(chain: Chain): string | undefined {
  for (const name of RPC_ENV_BY_CHAIN[chain.id] ?? []) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  // Fall back to the chain's default public RPC.
  return chain.rpcUrls.default.http[0];
}

function publicClientForChain(chainId: number): PublicClient | null {
  const existing = publicClients.get(chainId);
  if (existing) return existing;
  const chain = VERIFY_CHAINS.find((candidate) => candidate.id === chainId);
  if (!chain) return null;
  const client = createPublicClient({
    chain,
    // Bounded timeout + a single retry so an unreachable/slow RPC fails fast
    // (a ~20s 401) instead of stalling the sign-in spinner indefinitely.
    transport: http(rpcUrlForChain(chain), { timeout: 10_000, retryCount: 1 }),
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

async function logInvalidSiweMessage(
  input: {
    message: string;
    signature: string;
    address: string;
    chainId?: number | null;
  },
  details: {
    reason: string;
    eoaError?: unknown;
    smartAccountError?: unknown;
  },
): Promise<void> {
  const recoveredAddress = await recoverSigner(input.message, input.signature);
  const lines = input.message.split(/\r?\n/);
  console.warn("[aomi][siwe] invalid signature", {
    reason: details.reason,
    expectedAddress: shortAddress(input.address),
    recoveredAddress: recoveredAddress ? shortAddress(recoveredAddress) : null,
    chainId: input.chainId ?? parseSiweChainId(input.message),
    messageShape: {
      lineCount: lines.length,
      firstLinePrefix: lines[0]?.slice(0, 80) ?? null,
      addressLine: lines[1] ? shortAddress(lines[1]) : null,
      addressMatches: lines[1]?.toLowerCase() === input.address.toLowerCase(),
      chainLine: lines.find((line) => line.startsWith("Chain ID: ")) ?? null,
    },
    eoaError: errorMessage(details.eoaError),
    smartAccountError: errorMessage(details.smartAccountError),
  });
}

async function recoverSigner(
  message: string,
  signature: string,
): Promise<string | null> {
  try {
    return await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return null;
  }
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}
