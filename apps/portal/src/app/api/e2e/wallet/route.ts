import { NextRequest, NextResponse } from "next/server";
import {
  E2E_WALLET_COOKIE,
  isE2EWalletEnabled,
  mintE2EWalletCookie,
  parseE2EAddress,
  parseE2EChainId,
  parseE2ETtlSeconds,
  validateE2EWalletToken,
} from "@portal/lib/e2e-wallet";

function redirectTarget(request: NextRequest): URL {
  const requested = request.nextUrl.searchParams.get("redirect") ?? "/";
  const target = new URL(requested, request.nextUrl.origin);
  if (target.origin !== request.nextUrl.origin) {
    return new URL("/", request.nextUrl.origin);
  }
  return target;
}

export function GET(request: NextRequest) {
  if (!isE2EWalletEnabled()) {
    return new NextResponse("E2E wallet seeding is disabled", {
      status: 404,
    });
  }

  const response = NextResponse.redirect(redirectTarget(request));

  if (request.nextUrl.searchParams.get("clear") === "1") {
    response.cookies.delete(E2E_WALLET_COOKIE);
    return response;
  }

  if (!validateE2EWalletToken(request.nextUrl.searchParams.get("token"))) {
    return new NextResponse("Invalid E2E wallet token", { status: 401 });
  }

  const address = parseE2EAddress(request.nextUrl.searchParams.get("address"));
  if (!address) {
    return new NextResponse("Invalid E2E wallet address", { status: 400 });
  }

  const chainId = parseE2EChainId(request.nextUrl.searchParams.get("chainId"));
  const ttlSeconds = parseE2ETtlSeconds(
    request.nextUrl.searchParams.get("ttl"),
  );
  const cookie = mintE2EWalletCookie({ address, chainId, ttlSeconds });
  if (!cookie) {
    return new NextResponse("E2E wallet seeding is unavailable", {
      status: 503,
    });
  }

  response.cookies.set(E2E_WALLET_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttlSeconds,
  });
  return response;
}
