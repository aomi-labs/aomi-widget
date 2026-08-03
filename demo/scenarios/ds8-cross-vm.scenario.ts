import type { Scenario } from "./types";

/**
 * Scenario 8: Ethereum and Solana in ONE thread — the differentiator take.
 *
 * DS2 proves the agent works on EVM. DS6 proves it works on Solana. Neither
 * proves the thing that is actually hard to copy: the same agent, the same
 * conversation, the same wallet chip, crossing virtual machines mid-thread
 * with no mode switch and no second product. Most agentic wallets are EVM-only;
 * the ones that aren't tend to be two apps wearing one logo.
 *
 * This is the one to show a partner who already believes we can do EVM.
 *
 * Requires BOTH environments up at once — anvil fork (chain 1) and the
 * Surfpool mirror — and an E2E wallet seeded with both addresses, which
 * `seedUrl` does automatically when a scenario declares `chains` and `svm`.
 * Both verifications run: EVM block-delta (anvil only mines on transactions)
 * AND the SVM balance assertions.
 *
 * STATUS: authored, not yet recorded. The two single-VM legs are proven
 * independently; what is unproven here is the two of them in one thread —
 * specifically whether the agent keeps both wallet identities straight across
 * a VM switch. That is exactly the risk worth finding out about, and it is
 * cheap to find out: both environments are forks.
 */
export const scenario: Scenario = {
  id: "ds8-cross-vm",
  title: "Stake on Ethereum, then swap on Solana — one conversation",
  chains: [1],
  apps: [],
  svm: {
    cluster: "mainnet-beta",
    fund: { sol: "10000000000" },
    tokenAccounts: [
      {
        symbol: "USDC",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "25000000",
      },
    ],
    verify: [
      // 3 SOL staked plus fees. Above 7.2 means the Solana leg never ran
      // — which, in a cross-VM take, is the interesting failure: it would mean
      // the agent lost the thread at the VM boundary.
      { kind: "sol", atMost: "7200000000" },
      // 3 SOL at ~1.41 SOL/mSOL mints ~2.12 mSOL; 1.8 tolerates the rate.
      {
        kind: "spl",
        symbol: "mSOL",
        mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
        atLeast: "1800000000",
      },
    ],
  },
  // The Solana leg is a MARINADE STAKE, not the original Jupiter swap.
  // Changed 2026-08-03 after a take where the ETH leg executed perfectly
  // (2.0 stETH on-chain) and the SOL swap died in the aggregator's
  // route-simulation loop — the exact failure that closed ds12. Staking on
  // both chains is also the tighter story: same verb, two VMs, and every
  // path in the take is one the studio has shipped at least twice.
  //
  // Sequential, one VM at a time, approval after each. Asking for both legs in
  // a single prompt is the tempting version and the wrong one to try first:
  // DS6 already showed that a bundle spanning more staging than the agent can
  // hold ends in a repair loop. Prove the crossing works, then compress.
  //
  // "Now on Solana" is the line that has to survive: it is the moment the
  // video is about.
  prompts: [
    "Stake 2 ETH with Lido.",
    "Yes, approve it.",
    "Now on Solana — stake 3 SOL with Marinade.",
    "Yes, approve it.",
  ],
  moneyShot:
    "The chain indicator flipping from Ethereum to Solana between two turns " +
    "of the same conversation, with both transactions confirmed above it.",
  timeoutMs: 420_000,
  expectsExecution: true,
};

export default scenario;
