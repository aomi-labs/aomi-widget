"use client";

import { ApiDrawer, type EndpointDef } from "./ApiDrawer";

const POLYMARKET_ENDPOINTS: EndpointDef[] = [
  // ── Gamma API (market data) ───────────────────────────────────────────
  {
    label: "Search Markets",
    method: "GET",
    path: "/markets",
    description:
      "Query prediction markets with filtering options. Returns markets with current prices, volumes, liquidity, and metadata.",
    params: [
      { key: "limit", placeholder: "Max results (default: 100, max: 1000)", defaultValue: "100" },
      { key: "offset", placeholder: "Pagination offset", defaultValue: "0" },
      { key: "active", placeholder: "true | false" },
      { key: "closed", placeholder: "true | false" },
      { key: "archived", placeholder: "true | false" },
      { key: "tag", placeholder: "e.g. crypto, sports, politics" },
    ],
  },
  {
    label: "Get Market by Slug",
    method: "GET",
    path: "/markets?slug=:slug",
    description:
      "Fetch a single market by its URL slug.",
    params: [
      {
        key: "slug",
        placeholder: "e.g. will-bitcoin-reach-100k-by-2025",
        required: true,
      },
    ],
  },
  {
    label: "Get Market by ID",
    method: "GET",
    path: "/markets/:conditionId",
    description:
      "Fetch detailed information about a specific market by its condition ID.",
    params: [
      {
        key: "conditionId",
        placeholder: "Condition ID (0x-prefixed hash)",
        required: true,
      },
    ],
  },

  // ── Data API (trades) ─────────────────────────────────────────────────
  {
    label: "Get Trades",
    method: "GET",
    path: "/trades",
    baseUrl: "https://data-api.polymarket.com",
    description:
      "Retrieve historical trades. Returns trade history with timestamps, prices, sizes, and user information.",
    params: [
      { key: "limit", placeholder: "Max results (default: 100, max: 10000)", defaultValue: "100" },
      { key: "offset", placeholder: "Pagination offset", defaultValue: "0" },
      { key: "market", placeholder: "Market condition ID (comma-separated)" },
      { key: "user", placeholder: "Wallet address (0x-prefixed)" },
      { key: "side", placeholder: "BUY | SELL" },
    ],
  },

  // ── CLOB API (orders) ─────────────────────────────────────────────────
  {
    label: "Get Order Book",
    method: "GET",
    path: "/book",
    baseUrl: "https://clob.polymarket.com",
    description:
      "Fetch the current order book for a token. Returns bids and asks with prices and sizes.",
    params: [
      { key: "token_id", placeholder: "Token ID (outcome token)", required: true },
    ],
  },
  {
    label: "Place Order",
    method: "POST",
    path: "/orders",
    baseUrl: "https://clob.polymarket.com",
    description:
      "Submit a signed order to the CLOB. Requires a wallet-signed EIP-712 payload with order parameters.",
    params: [],
    headers: [
      { key: "POLY_ADDRESS", placeholder: "Wallet address (0x-prefixed)", required: true },
      { key: "POLY_SIGNATURE", placeholder: "L2 HMAC signature", required: true },
      { key: "POLY_TIMESTAMP", placeholder: "Unix timestamp", required: true },
      { key: "POLY_API_KEY", placeholder: "CLOB API key", required: true },
      { key: "POLY_PASSPHRASE", placeholder: "CLOB passphrase", required: true },
    ],
    bodyTemplate: JSON.stringify(
      {
        order: {
          tokenID: "...",
          side: "BUY",
          size: "50.0",
          price: "0.65",
          feeRateBps: "0",
          nonce: "0",
          expiration: "0",
          taker: "0x0000000000000000000000000000000000000000",
        },
        owner: "0x...",
        orderType: "GTC",
      },
      null,
      2,
    ),
  },
];

export function PolymarketConsole() {
  return (
    <ApiDrawer
      defaultBaseUrl="https://gamma-api.polymarket.com"
      endpoints={POLYMARKET_ENDPOINTS}
    />
  );
}
