import { type NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  verifyMessage as verifyEoaMessage,
  type PublicClient,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  generateSiweNonce,
  parseSiweMessage,
  validateSiweMessage,
} from "viem/siwe";

import { resolveOrCreateByWallet } from "./account-graph";
import { mintAccountBearer } from "./bearer";
import { setSessionCookie } from "./session";

const NONCE_COOKIE = "aomi_siwe_nonce";
const NONCE_TTL_SECONDS = 5 * 60;

export type SiweConfig = {
  allowedChainIds?: ReadonlyArray<number>;
};

const SUPPORTED_CHAINS = [base, baseSepolia] as const;

const RPC_ENV_BY_CHAIN: Record<number, string> = {
  [base.id]: "BASE_RPC_URL",
  [baseSepolia.id]: "BASE_SEPOLIA_RPC_URL",
};

function publicClientForChain(chainId: number): PublicClient | null {
  const chain = SUPPORTED_CHAINS.find((candidate) => candidate.id === chainId);
  if (!chain) return null;
  const rpcUrl = process.env[RPC_ENV_BY_CHAIN[chainId]]?.trim() || undefined;
  return createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;
}

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

  const chainId = input.chainId ?? null;
  if (chainId == null) return false;
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

function nonceCookie(value: string, maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    value,
  };
}

export function createSiweNonceRoute() {
  return async function GET(): Promise<NextResponse> {
    const nonce = generateSiweNonce();
    const response = NextResponse.json({ nonce });
    const cookie = nonceCookie(nonce, NONCE_TTL_SECONDS);
    response.cookies.set(NONCE_COOKIE, cookie.value, cookie);
    return response;
  };
}

export function createSiweExchangeRoute(config: SiweConfig = {}) {
  const allowed = config.allowedChainIds
    ? new Set(config.allowedChainIds)
    : null;

  return async function POST(request: NextRequest): Promise<NextResponse> {
    try {
      const body = (await request.json()) as {
        message?: unknown;
        signature?: unknown;
      };
      const message = typeof body.message === "string" ? body.message : null;
      const signature =
        typeof body.signature === "string" ? body.signature : null;
      if (!message || !signature) {
        return NextResponse.json(
          { error: "Missing SIWE message or signature" },
          { status: 400 },
        );
      }

      const expectedNonce = request.cookies.get(NONCE_COOKIE)?.value;
      if (!expectedNonce) {
        return NextResponse.json(
          { error: "Missing or expired SIWE nonce" },
          { status: 400 },
        );
      }
      const clearNonce = (response: NextResponse): NextResponse => {
        const cleared = nonceCookie("", 0);
        response.cookies.set(NONCE_COOKIE, cleared.value, cleared);
        return response;
      };

      const parsed = (() => {
        try {
          return parseSiweMessage(message);
        } catch {
          return null;
        }
      })();
      if (!parsed) {
        return clearNonce(
          NextResponse.json({ error: "Invalid SIWE message" }, { status: 400 }),
        );
      }
      const address = parsed.address;
      const chainId = parsed.chainId;
      if (!address || typeof chainId !== "number") {
        return clearNonce(
          NextResponse.json({ error: "Invalid SIWE message" }, { status: 400 }),
        );
      }
      if (allowed && !allowed.has(chainId)) {
        return clearNonce(
          NextResponse.json(
            { error: `Unsupported chain ${chainId}` },
            { status: 400 },
          ),
        );
      }

      const fieldsOk = validateSiweMessage({
        message: parsed,
        nonce: expectedNonce,
        domain: request.headers.get("host") ?? undefined,
      });
      if (!fieldsOk) {
        return clearNonce(
          NextResponse.json(
            { error: "Invalid SIWE message fields" },
            { status: 400 },
          ),
        );
      }

      const valid = await verifySiweMessage({
        message,
        signature,
        address,
        chainId,
      });
      if (!valid) {
        return clearNonce(
          NextResponse.json(
            { error: "SIWE verification failed" },
            { status: 401 },
          ),
        );
      }

      const { userId } = await resolveOrCreateByWallet(address);
      await mintAccountBearer(userId);

      const response = NextResponse.json({
        ok: true,
        user_id: userId,
      });
      await setSessionCookie(response, userId);
      return clearNonce(response);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "SIWE exchange failed";
      const response = NextResponse.json({ error: messageText }, { status: 500 });
      if (request.cookies.get(NONCE_COOKIE)?.value) {
        const cleared = nonceCookie("", 0);
        response.cookies.set(NONCE_COOKIE, cleared.value, cleared);
      }
      return response;
    }
  };
}
