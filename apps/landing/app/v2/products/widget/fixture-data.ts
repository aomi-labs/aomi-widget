export type WidgetFixtureScenario = "somm" | "trading" | "prediction";

export type WidgetFixtureKey =
  | "somm-aave"
  | "somm-sky"
  | "somm-compound"
  | "trading-eth"
  | "trading-btc"
  | "prediction-yes"
  | "prediction-no";

export type WidgetFixtureStep = {
  name: string;
  topic: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
};

export type WidgetFixture = {
  scenario: WidgetFixtureScenario;
  title: string;
  prompt: string;
  steps: WidgetFixtureStep[];
  answer: string;
};

export const widgetFixtureCatalog: Record<WidgetFixtureKey, WidgetFixture> = {
  "somm-aave": {
    scenario: "somm",
    title: "Idle USDC allocation",
    prompt: "Put the idle USDC to work — best net yield, band A only.",
    steps: [
      {
        name: "scan_eligible_venues",
        topic: "Scanning eligible venues",
        arguments: { asset: "USDC", risk_band: "A" },
        result: { markets: 6, chains: 3, eligible: 1 },
      },
      {
        name: "check_mandate",
        topic: "Checking Somm mandate",
        arguments: { venue: "aave-v3", chain: "base" },
        result: { venue: "Aave v3", risk_band: "A", passed: true },
      },
    ],
    answer:
      "**Aave v3 on Base is eligible.** I prepared the USDC supply and simulated the complete move against forked live state. Review the exact transaction when you are ready to sign.",
  },
  "somm-sky": {
    scenario: "somm",
    title: "Sky mandate review",
    prompt: "Check whether the idle USDC can move into Sky Lending.",
    steps: [
      {
        name: "inspect_venue",
        topic: "Reading Sky Lending market",
        arguments: { venue: "sky-lending", chain: "ethereum" },
        result: { net_apy: "6.12%", deposit_status: "tracked" },
      },
      {
        name: "check_mandate",
        topic: "Checking Somm mandate",
        arguments: { venue: "sky-lending", chain: "ethereum" },
        result: { risk_band: "A", deposits_open: false },
      },
    ],
    answer:
      "**Sky Lending is inside band A, but new deposits are not open.** I left the USDC untouched and prepared no transaction. I will keep tracking the 6.12% net APY for the next cycle.",
  },
  "somm-compound": {
    scenario: "somm",
    title: "Compound venue comparison",
    prompt: "Compare Compound v3 with the currently open venue.",
    steps: [
      {
        name: "compare_net_yield",
        topic: "Comparing net yield",
        arguments: { venue: "compound-v3", asset: "USDC" },
        result: { compound: "3.30%", aave: "3.37%" },
      },
      {
        name: "check_mandate",
        topic: "Checking Somm mandate",
        arguments: { venue: "compound-v3", chain: "ethereum" },
        result: { risk_band: "A", passed: true },
      },
    ],
    answer:
      "**Compound v3 passes the mandate, but Aave remains 7 bps better net.** No rebalance is warranted after gas and bridge costs, so the existing Base allocation stays in place.",
  },
  "trading-eth": {
    scenario: "trading",
    title: "20 ETH routed order",
    prompt:
      "Buy 20 ETH at the best executable price. Split venues and keep slippage below 20 bps.",
    steps: [
      {
        name: "quote_venues",
        topic: "Quoting connected venues",
        arguments: { pair: "ETH/USDC", amount: "20 ETH" },
        result: { uniswap: "12.4 ETH", zero_x: "7.6 ETH" },
      },
      {
        name: "simulate_split_route",
        topic: "Simulating split route",
        arguments: { max_slippage_bps: 20 },
        result: { price_impact: "0.14%", policy: "passed" },
      },
    ],
    answer:
      "The best executable route uses **12.4 ETH on Uniswap** and **7.6 ETH through 0x RFQ**. Estimated price impact is 14 bps and the policy check passed.",
  },
  "trading-btc": {
    scenario: "trading",
    title: "1 BTC routed order",
    prompt:
      "Buy 1 BTC at the best executable price and keep slippage below 15 bps.",
    steps: [
      {
        name: "quote_venues",
        topic: "Quoting connected venues",
        arguments: { pair: "BTC/USDC", amount: "1 BTC" },
        result: { uniswap: "0.62 BTC", zero_x: "0.38 BTC" },
      },
      {
        name: "simulate_split_route",
        topic: "Simulating split route",
        arguments: { max_slippage_bps: 15 },
        result: { price_impact: "0.09%", policy: "passed" },
      },
    ],
    answer:
      "The BTC route uses **0.62 BTC on Uniswap** and **0.38 BTC through 0x RFQ**. Estimated price impact is 9 bps, inside the 15 bps policy limit.",
  },
  "prediction-yes": {
    scenario: "prediction",
    title: "Bounded YES position",
    prompt:
      "Buy $500 of YES at 62¢ or better. Do not exceed my $500 market limit.",
    steps: [
      {
        name: "read_market",
        topic: "Reading market and liquidity",
        arguments: { outcome: "YES", limit_price: 0.62 },
        result: { probability: "58%", liquidity: "$740K" },
      },
      {
        name: "check_exposure_policy",
        topic: "Checking exposure policy",
        arguments: { notional: 500, max_loss: 500 },
        result: { shares: "806.45", max_loss: "$500", passed: true },
      },
    ],
    answer:
      "The order is within your price and exposure limits: **806.45 YES shares at a 62¢ limit**, with maximum loss capped at $500. The position is simulated and ready for review.",
  },
  "prediction-no": {
    scenario: "prediction",
    title: "Bounded NO position",
    prompt:
      "Buy $500 of NO at 44¢ or better. Do not exceed my $500 market limit.",
    steps: [
      {
        name: "read_market",
        topic: "Reading market and liquidity",
        arguments: { outcome: "NO", limit_price: 0.44 },
        result: { probability: "42%", liquidity: "$740K" },
      },
      {
        name: "check_exposure_policy",
        topic: "Checking exposure policy",
        arguments: { notional: 500, max_loss: 500 },
        result: { shares: "1,136.36", max_loss: "$500", passed: true },
      },
    ],
    answer:
      "The order is within your price and exposure limits: **1,136.36 NO shares at a 44¢ limit**, with maximum loss capped at $500. The position is simulated and ready for review.",
  },
};

export function resolveWidgetFixture(
  value: string,
): [WidgetFixtureKey, WidgetFixture] {
  const aliases: Record<string, WidgetFixtureKey> = {
    somm: "somm-aave",
    trading: "trading-eth",
    prediction: "prediction-yes",
  };
  const key =
    aliases[value] ??
    ((value in widgetFixtureCatalog ? value : "somm-aave") as WidgetFixtureKey);
  return [key, widgetFixtureCatalog[key]];
}
