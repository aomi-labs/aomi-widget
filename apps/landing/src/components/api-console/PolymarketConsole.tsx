"use client";

import { ApiConsole, type EndpointDef } from "./ApiConsole";

const POLYMARKET_ENDPOINTS: EndpointDef[] = [
  {
    label: "List Markets",
    method: "GET",
    path: "/api/markets",
    description:
      "Fetch available prediction markets with optional filters for category and status.",
    params: [
      { key: "category", placeholder: "e.g. politics, crypto, sports" },
      {
        key: "status",
        placeholder: "open | closed | resolved",
        defaultValue: "open",
      },
      { key: "limit", placeholder: "Number of results", defaultValue: "20" },
      { key: "offset", placeholder: "Pagination offset", defaultValue: "0" },
    ],
    headers: [
      {
        key: "X-Session-Id",
        placeholder: "Session UUID",
        required: true,
      },
      { key: "X-API-Key", placeholder: "Optional API key" },
    ],
  },
  {
    label: "Get Market",
    method: "GET",
    path: "/api/markets/:marketId",
    description:
      "Fetch details for a single market including current prices, volume, and resolution criteria.",
    params: [
      {
        key: "marketId",
        placeholder: "Market ID",
        required: true,
      },
    ],
    headers: [
      {
        key: "X-Session-Id",
        placeholder: "Session UUID",
        required: true,
      },
      { key: "X-API-Key", placeholder: "Optional API key" },
    ],
  },
  {
    label: "Place Bet",
    method: "POST",
    path: "/api/markets/:marketId/bet",
    description:
      "Place a bet on a prediction market outcome. Returns a transaction for wallet approval.",
    params: [
      {
        key: "marketId",
        placeholder: "Market ID",
        required: true,
      },
    ],
    headers: [
      {
        key: "X-Session-Id",
        placeholder: "Session UUID",
        required: true,
      },
      { key: "X-API-Key", placeholder: "Optional API key" },
    ],
    bodyTemplate: JSON.stringify(
      {
        outcome: "YES",
        amount: "10.00",
        maxPrice: "0.65",
      },
      null,
      2,
    ),
  },
  {
    label: "Get Positions",
    method: "GET",
    path: "/api/positions",
    description:
      "Fetch the user's current positions across all markets.",
    params: [
      {
        key: "status",
        placeholder: "active | settled | all",
        defaultValue: "active",
      },
    ],
    headers: [
      {
        key: "X-Session-Id",
        placeholder: "Session UUID",
        required: true,
      },
      { key: "X-API-Key", placeholder: "Optional API key" },
    ],
  },
  {
    label: "Sell Position",
    method: "POST",
    path: "/api/positions/:positionId/sell",
    description:
      "Sell an existing position. Returns a transaction for wallet approval.",
    params: [
      {
        key: "positionId",
        placeholder: "Position ID",
        required: true,
      },
    ],
    headers: [
      {
        key: "X-Session-Id",
        placeholder: "Session UUID",
        required: true,
      },
      { key: "X-API-Key", placeholder: "Optional API key" },
    ],
    bodyTemplate: JSON.stringify(
      {
        shares: "5.0",
        minPrice: "0.70",
      },
      null,
      2,
    ),
  },
  {
    label: "Get Orderbook",
    method: "GET",
    path: "/api/markets/:marketId/orderbook",
    description:
      "Fetch the current orderbook for a market showing bids and asks.",
    params: [
      {
        key: "marketId",
        placeholder: "Market ID",
        required: true,
      },
      {
        key: "depth",
        placeholder: "Orderbook depth",
        defaultValue: "10",
      },
    ],
    headers: [
      {
        key: "X-Session-Id",
        placeholder: "Session UUID",
        required: true,
      },
      { key: "X-API-Key", placeholder: "Optional API key" },
    ],
  },
];

export function PolymarketConsole() {
  return (
    <ApiConsole
      defaultBaseUrl="https://api.aomi.dev"
      endpoints={POLYMARKET_ENDPOINTS}
    />
  );
}
