#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const portalUrl = stripTrailingSlash(
  process.env.AOMI_LOCAL_PORTAL_URL ?? "http://localhost:3000",
);
const backendUrl = stripTrailingSlash(
  process.env.AOMI_LOCAL_BACKEND_URL ?? "http://127.0.0.1:8080",
);
let cookieHeader = process.env.AOMI_PORTAL_COOKIE?.trim();
const sessionBearer = process.env.AOMI_SESSION_BEARER?.trim();
const sessionId = process.env.AOMI_SMOKE_SESSION_ID ?? randomUUID();
const runSiweFlow = process.env.AOMI_SMOKE_SIWE === "1";
const chainId = Number(process.env.AOMI_SMOKE_CHAIN_ID ?? 11155111);

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function short(value) {
  if (!value || typeof value !== "string" || value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function authHeaders() {
  const headers = new Headers({ Accept: "application/json" });
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  if (sessionBearer) headers.set("Authorization", `Bearer ${sessionBearer}`);
  return headers;
}

function backendHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Session-Id": sessionId,
  };
}

function portalHeaders(extra = {}) {
  return new Headers([...authHeaders().entries(), ...Object.entries(extra)]);
}

async function check(label, url, init, expected = [200]) {
  const response = await fetch(url, init);
  const ok = expected.includes(response.status);
  console.log(`${ok ? "ok" : "fail"} ${label}: HTTP ${response.status}`);
  if (!ok) {
    const text = await response.text().catch(() => "");
    if (text) console.log(text.slice(0, 500));
    process.exitCode = 1;
  }
  return response;
}

async function readJsonOrThrow(response, label) {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${label} failed: HTTP ${response.status} ${text}`);
  }
  return body;
}

function decodeJwtPayload(token) {
  const [header, payload] = token.split(".");
  if (!header || !payload) return null;
  const decode = (part) =>
    JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  return { header: decode(header), payload: decode(payload) };
}

function buildSiweMessage(input) {
  const origin = portalUrl;
  const domain = new URL(portalUrl).host;
  return `${domain} wants you to sign in with your Ethereum account:
${input.address}

Sign in to Aomi.

URI: ${origin}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

function buildWalletLinkMessage(input) {
  const origin = portalUrl;
  const domain = new URL(portalUrl).host;
  return `${domain} wants to link this wallet to your Aomi account:
${input.address}

Only sign this message if you want this wallet attached to the current Aomi account.

URI: ${origin}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

class CookieJar {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
  }

  setFrom(response) {
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const pair = cookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) {
        this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }
  }

  header() {
    return [...this.cookies.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookie = this.header();
    if (cookie) headers.set("Cookie", cookie);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${portalUrl}${path}`, {
      ...options,
      headers,
      redirect: "manual",
    });
    this.setFrom(response);
    return response;
  }
}

async function signInWithWallet(jar, wallet) {
  const nonceResponse = await jar.request("/api/auth/siwe/nonce", {
    method: "POST",
    body: JSON.stringify({
      walletAddress: wallet.address,
      chainId,
    }),
  });
  const { nonce } = await readJsonOrThrow(
    nonceResponse,
    `${jar.label} SIWE nonce`,
  );
  const message = buildSiweMessage({
    address: wallet.address,
    chainId,
    nonce,
  });
  const signature = await wallet.signMessage({ message });
  const verifyResponse = await jar.request("/api/auth/siwe/verify", {
    method: "POST",
    body: JSON.stringify({
      message,
      signature,
      walletAddress: wallet.address,
      chainId,
    }),
  });
  await readJsonOrThrow(verifyResponse, `${jar.label} SIWE verify`);
}

async function bootstrapSiweSession() {
  const walletOne = privateKeyToAccount(generatePrivateKey());
  const walletTwo = privateKeyToAccount(generatePrivateKey());
  const jar = new CookieJar("wallet1");

  await signInWithWallet(jar, walletOne);
  const accountOne = await readJsonOrThrow(
    await jar.request("/api/aomi/account"),
    "account after wallet1 sign-in",
  );
  const accountId = accountOne?.user?.id;
  console.log(
    `siwe wallet1: ${short(walletOne.address)} account=${accountId ?? "unknown"}`,
  );

  const nonceResponse = await readJsonOrThrow(
    await jar.request(
      `/api/aomi/wallets/link?address=${encodeURIComponent(
        walletTwo.address,
      )}&chainId=${chainId}`,
    ),
    "wallet link nonce",
  );
  const message = buildWalletLinkMessage({
    address: walletTwo.address,
    chainId,
    nonce: nonceResponse.nonce,
  });
  const signature = await walletTwo.signMessage({ message });
  const linkResponse = await readJsonOrThrow(
    await jar.request("/api/aomi/wallets/link", {
      method: "POST",
      body: JSON.stringify({
        family: "evm",
        address: walletTwo.address,
        chainId,
        nonce: nonceResponse.nonce,
        message,
        signature,
      }),
    }),
    "wallet2 link",
  );
  console.log(
    `siwe wallet2 linked: ${short(walletTwo.address)} status=${linkResponse?.status ?? "unknown"}`,
  );

  cookieHeader = jar.header();
  return { accountId, walletTwo };
}

async function verifySecondWalletSeesThread(
  { walletTwo, accountId },
  threadId,
) {
  const jar = new CookieJar("wallet2");
  await signInWithWallet(jar, walletTwo);
  const accountTwo = await readJsonOrThrow(
    await jar.request("/api/aomi/account"),
    "account after wallet2 sign-in",
  );
  const accountIdTwo = accountTwo?.user?.id;
  const sameAccount = Boolean(accountId && accountId === accountIdTwo);
  console.log(
    `siwe wallet2 account: ${accountIdTwo ?? "unknown"} sameAccount=${sameAccount}`,
  );

  const listResponse = await readJsonOrThrow(
    await jar.request("/api/sessions", {
      headers: { "X-Session-Id": threadId },
    }),
    "wallet2 thread list",
  );
  const containsCreated = Array.isArray(listResponse)
    ? listResponse.some((thread) => thread?.session_id === threadId)
    : false;
  console.log(`siwe wallet2 thread visibility: ${containsCreated}`);
  if (!sameAccount || !containsCreated) {
    process.exitCode = 1;
  }
}

await check("backend health", `${backendUrl}/health`);
await check("portal health", `${portalUrl}/`);

let siweContext = null;
if (!cookieHeader && !sessionBearer && runSiweFlow) {
  siweContext = await bootstrapSiweSession();
}

const accountResponse = await check(
  "portal account endpoint",
  `${portalUrl}/api/aomi/account`,
  {
    headers: authHeaders(),
  },
);
const account = await accountResponse.json().catch(() => null);
console.log(`account: ${account?.user?.id ? "authenticated" : "anonymous"}`);

if (!cookieHeader && !sessionBearer) {
  console.log(
    "auth path skipped: set AOMI_SMOKE_SIWE=1, AOMI_PORTAL_COOKIE, or AOMI_SESSION_BEARER",
  );
  process.exit(process.exitCode ?? 0);
}

const tokenResponse = await check(
  "BFF bearer token",
  `${portalUrl}/api/bff/auth/token`,
  { headers: authHeaders() },
);
if (!tokenResponse.ok) {
  process.exit(process.exitCode ?? 1);
}
const tokenBody = await tokenResponse.json();
const token = tokenBody.bearer;
if (typeof token !== "string" || !token) {
  console.log("fail BFF bearer token: response did not include bearer");
  process.exit(1);
}

const decoded = decodeJwtPayload(token);
console.log("bearer claims:", {
  kid: decoded?.header?.kid,
  iss: decoded?.payload?.iss,
  aud: decoded?.payload?.aud,
  role: decoded?.payload?.role,
  sub: decoded?.payload?.sub ? "[redacted]" : undefined,
  exp: decoded?.payload?.exp,
});

await check("backend accepts bearer", `${backendUrl}/api/sessions?limit=5`, {
  headers: backendHeaders(token),
});

const createResponse = await check(
  "backend creates account thread",
  `${backendUrl}/api/sessions`,
  {
    method: "POST",
    headers: backendHeaders(token),
  },
);
const created = await createResponse.json().catch(() => null);
const createdSessionId = created?.session_id;
console.log(`created thread: ${createdSessionId ?? "unknown"}`);

await check(
  "backend lists created thread",
  `${backendUrl}/api/sessions?limit=10`,
  {
    headers: backendHeaders(token),
  },
);

if (createdSessionId) {
  await check("backend state call", `${backendUrl}/api/state`, {
    headers: {
      ...backendHeaders(token),
      "X-Session-Id": createdSessionId,
    },
  });
}

await check("portal proxy lists threads", `${portalUrl}/api/sessions?limit=5`, {
  headers: portalHeaders({ "X-Session-Id": sessionId }),
});

const appsResponse = await check(
  "portal proxy lists account apps",
  `${portalUrl}/api/account/apps`,
  {
    headers: portalHeaders({ "X-Session-Id": sessionId }),
  },
);
const apps = await appsResponse.json().catch(() => []);
const appNames = Array.isArray(apps)
  ? apps
      .map((app) => (typeof app === "string" ? app : app?.name))
      .filter(Boolean)
  : [];
console.log(
  `account apps: ${appNames.length} (${appNames.includes("default") ? "has default" : "no default"})`,
);

const keyResponse = await check(
  "portal proxy creates app key",
  `${portalUrl}/api/account/app-keys`,
  {
    method: "POST",
    headers: portalHeaders({
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    }),
    body: JSON.stringify({
      apps: ["default"],
      label: `local-smoke-${Date.now().toString(36)}`,
    }),
  },
);
const keyBody = await keyResponse.json().catch(() => null);
console.log(
  `created app key: ${
    typeof keyBody?.app_key === "string"
      ? `${keyBody.app_key.slice(0, 8)}...`
      : "unknown"
  }`,
);

if (createdSessionId) {
  await check(
    "portal proxy sends chat message",
    `${portalUrl}/api/chat?app=default&message=${encodeURIComponent(
      "local auth stack smoke",
    )}`,
    {
      method: "POST",
      headers: portalHeaders({ "X-Session-Id": createdSessionId }),
    },
  );
}

if (siweContext && createdSessionId) {
  await verifySecondWalletSeesThread(siweContext, createdSessionId);
}
