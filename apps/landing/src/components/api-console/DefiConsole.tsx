"use client";

import { ApiDrawer, type EndpointDef } from "./ApiDrawer";

const DEFI_ENDPOINTS: EndpointDef[] = [
  // ── DefiLlama — Informational ──────────────────────────────────────────

  {
    label: "Get Token Price",
    method: "GET",
    path: "/prices/current/:coins",
    baseUrl: "https://coins.llama.fi",
    description:
      "Get current token prices from DefiLlama. Coins use the format chain:address (e.g. ethereum:0xdF574...) or coingecko:id (e.g. coingecko:ethereum).",
    params: [
      {
        key: "coins",
        placeholder: "coingecko:ethereum,coingecko:bitcoin",
        required: true,
        defaultValue: "coingecko:ethereum",
      },
      {
        key: "searchWidth",
        placeholder: "Price lookback window (e.g. 4h)",
      },
    ],
  },
  {
    label: "Get Yield Opportunities",
    method: "GET",
    path: "/pools",
    baseUrl: "https://yields.llama.fi",
    description:
      "List DeFi yield pools from DefiLlama sorted by APY. Returns all pools — filter client-side by chain, project, or stablecoin flag.",
    params: [],
  },
  {
    label: "Get DeFi Protocols",
    method: "GET",
    path: "/protocols",
    baseUrl: "https://api.llama.fi",
    description:
      "List all DeFi protocols tracked by DefiLlama with TVL, category, supported chains, and 24h change.",
    params: [],
  },
  {
    label: "Get Chain TVL",
    method: "GET",
    path: "/v2/chains",
    baseUrl: "https://api.llama.fi",
    description:
      "Get current total value locked per chain. Returns all chains ranked by TVL with native token info.",
    params: [],
  },
  {
    label: "Get Bridges",
    method: "GET",
    path: "/bridges",
    baseUrl: "https://bridges.llama.fi",
    description:
      "List cross-chain bridges with 24h and 7d volume data. Useful for comparing bridge liquidity and supported chains.",
    params: [],
  },

  // ── 0x Swap API v2 ────────────────────────────────────────────────────

  {
    label: "Get 0x Swap Quote",
    method: "GET",
    path: "/swap/allowance-holder/price",
    baseUrl: "https://api.0x.org",
    description:
      "Get an indicative swap price from the 0x aggregator. Requires a 0x API key. Use chainId to specify the network.",
    params: [
      {
        key: "chainId",
        placeholder: "1 (Ethereum), 137 (Polygon), 42161 (Arbitrum)",
        required: true,
        defaultValue: "1",
      },
      {
        key: "sellToken",
        placeholder: "Token address to sell (e.g. 0xA0b8...)",
        required: true,
      },
      {
        key: "buyToken",
        placeholder: "Token address to buy",
        required: true,
      },
      {
        key: "sellAmount",
        placeholder: "Amount in base units (wei)",
        required: true,
      },
      {
        key: "taker",
        placeholder: "Taker wallet address (0x-prefixed)",
      },
      {
        key: "slippageBps",
        placeholder: "Slippage in basis points (e.g. 50 = 0.5%)",
      },
    ],
    headers: [
      {
        key: "0x-api-key",
        placeholder: "Your 0x API key (from dashboard.0x.org)",
        required: true,
      },
      {
        key: "0x-version",
        placeholder: "API version",
        defaultValue: "v2",
      },
    ],
  },

  // ── LI.FI API ─────────────────────────────────────────────────────────

  {
    label: "Get LI.FI Quote",
    method: "GET",
    path: "/v1/quote",
    baseUrl: "https://li.quest",
    description:
      "Get a cross-chain or same-chain swap quote from LI.FI. Supports bridging + swapping in a single step. No API key required.",
    params: [
      {
        key: "fromChain",
        placeholder: "Source chain ID or name (e.g. 1, ETH)",
        required: true,
        defaultValue: "1",
      },
      {
        key: "toChain",
        placeholder: "Destination chain ID or name",
        required: true,
        defaultValue: "1",
      },
      {
        key: "fromToken",
        placeholder: "Source token address",
        required: true,
      },
      {
        key: "toToken",
        placeholder: "Destination token address",
        required: true,
      },
      {
        key: "fromAmount",
        placeholder: "Amount in base units (with decimals)",
        required: true,
      },
      {
        key: "fromAddress",
        placeholder: "Sender wallet address",
        required: true,
      },
      {
        key: "toAddress",
        placeholder: "Receiver wallet address (optional)",
      },
      {
        key: "slippage",
        placeholder: "Slippage tolerance (0-1, e.g. 0.005)",
      },
      {
        key: "order",
        placeholder: "FASTEST or CHEAPEST",
      },
    ],
  },

  // ── CoW Protocol ──────────────────────────────────────────────────────

  {
    label: "Get CoW Quote",
    method: "POST",
    path: "/mainnet/api/v1/quote",
    baseUrl: "https://api.cow.fi",
    description:
      "Request a swap quote from CoW Protocol. Change the path segment to target different chains: mainnet, xdai, arbitrum_one, base, polygon.",
    params: [],
    bodyTemplate: JSON.stringify(
      {
        sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        sellAmountBeforeFee: "1000000000000000000",
        from: "0x...",
        kind: "sell",
        signingScheme: "eip712",
      },
      null,
      2,
    ),
  },
  {
    label: "Place CoW Order",
    method: "POST",
    path: "/mainnet/api/v1/orders",
    baseUrl: "https://api.cow.fi",
    description:
      "Submit a signed order to the CoW Protocol orderbook. Requires a fully-signed EIP-712 payload. Change path for other chains.",
    params: [],
    bodyTemplate: JSON.stringify(
      {
        sellToken: "0x...",
        buyToken: "0x...",
        sellAmount: "1000000000000000000",
        buyAmount: "...",
        validTo: 0,
        feeAmount: "...",
        kind: "sell",
        partiallyFillable: false,
        receiver: "0x...",
        signature: "0x...",
        signingScheme: "eip712",
        from: "0x...",
      },
      null,
      2,
    ),
  },
];

export function DefiConsole() {
  return (
    <ApiDrawer
      defaultBaseUrl="https://api.llama.fi"
      endpoints={DEFI_ENDPOINTS}
    />
  );
}
