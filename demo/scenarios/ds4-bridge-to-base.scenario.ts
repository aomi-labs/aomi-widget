import type { Scenario } from "./types";

/**
 * Cross-chain intent — and the one scenario here with a known, honest limit.
 *
 * We fork Ethereum only, so the SOURCE-side deposit is real and lands on the
 * fork; the Base-side arrival never happens, because that requires the real L2
 * sequencer watching the real L1. The take is therefore truthful about
 * *initiating* a bridge and must never be narrated as a completed one.
 *
 * The canonical Base bridge is used deliberately over Across / LI.FI: those are
 * filler networks whose relayers watch real chains and would never see this
 * fork at all, so they cannot produce even a source-side demo. Same reason the
 * gasless-swap scenario from the catalog is unrecordable here — anything that
 * depends on an off-chain service cannot be forked.
 *
 * Made harder than "bridge some ETH": the agent has to decide how much to keep
 * back for gas rather than being handed an amount.
 */
export const scenario: Scenario = {
  id: "ds4-bridge-to-base",
  title: "Move most of my ETH to Base, keep enough for gas",
  story: "DS4",
  chains: [1],
  apps: [],
  prompts: [
    "Move most of my ETH over to Base — leave me enough on mainnet to cover gas for a few transactions",
    "That split works — bridge it.",
  ],
  moneyShot:
    "The agent reasoning about a gas reserve it was never given, then the L1 deposit landing on-chain.",
  timeoutMs: 240_000,
  expectsExecution: true,
};

export default scenario;
