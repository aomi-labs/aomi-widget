import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, type PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";

import { resolveOrCreateByWallet } from "./account-graph";
import { mintAccountBearer } from "./bearer";
import { setSessionCookie } from "./session";

/**
 * **Sign-In With Ethereum** (EIP-4361) exchange for base. base authenticates
 * with a Coinbase/Base **smart account**, which has no provider JWT to swap (see
 * `createAuthExchangeRoute`), so its session is minted from a *wallet-ownership
 * proof* instead: the browser signs a server-issued nonce, and this verifies the
 * signature on-chain (EIP-1271 / ERC-6492 for smart accounts) before resolving
 * the canonical user keyed by the proven address.
 *
 * Two routes, mounted by base:
 * - `GET  /api/bff/auth/siwe/nonce`  → `createSiweNonceRoute()`
 * - `POST /api/bff/auth/siwe/verify` → `createSiweExchangeRoute()`
 */
const NONCE_COOKIE = "aomi_siwe_nonce";
const NONCE_TTL_SECONDS = 5 * 60;

export type SiweConfig = {
  /** EVM chains whose SIWE logins this app accepts. Defaults to Base + Base Sepolia. */
  allowedChainIds?: ReadonlyArray<number>;
};

const SUPPORTED_CHAINS = [base, baseSepolia] as const;

// Per-chain RPC override, e.g. BASE_RPC_URL / BASE_SEPOLIA_RPC_URL. Falls back to
// the chain's default public RPC when unset.
const RPC_ENV_BY_CHAIN: Record<number, string> = {
  [base.id]: "BASE_RPC_URL",
  [baseSepolia.id]: "BASE_SEPOLIA_RPC_URL",
};

function publicClientForChain(chainId: number): PublicClient | null {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain) return null;
  const rpcUrl = process.env[RPC_ENV_BY_CHAIN[chainId]]?.trim() || undefined;
  return createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;
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

/** Issue a single-use SIWE nonce, bound to the browser via an httpOnly cookie. */
export function createSiweNonceRoute() {
  return async function GET(): Promise<NextResponse> {
    const nonce = generateSiweNonce();
    const response = NextResponse.json({ nonce });
    const cookie = nonceCookie(nonce, NONCE_TTL_SECONDS);
    response.cookies.set(NONCE_COOKIE, cookie.value, cookie);
    return response;
  };
}

/**
 * Verify a SIWE message + signature, then establish OUR session: resolve-or-
 * create the canonical user keyed by the proven address, set the `aomi_session`
 * cookie, and return only session metadata. The nonce is single-use: once the
 * verify endpoint sees a nonce, it clears it on every terminal response.
 */
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

      const client = publicClientForChain(chainId);
      if (!client) {
        return clearNonce(
          NextResponse.json(
            { error: `Unsupported chain ${chainId}` },
            { status: 400 },
          ),
        );
      }

      // Verify on-chain (EIP-1271 / ERC-6492 for smart accounts), binding the
      // message to the nonce we issued and this request's host (domain).
      const valid = await client.verifySiweMessage({
        message,
        signature: signature as `0x${string}`,
        nonce: expectedNonce,
        domain: request.headers.get("host") ?? undefined,
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
      // Validate signer configuration before reporting the session ready. The
      // bearer never leaves the server; the proxy mints one per backend request.
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
