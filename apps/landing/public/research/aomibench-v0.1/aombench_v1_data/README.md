# Aomi Bench v0.1

Expanded public-skills benchmark across the original suite and the 2026-05-31 expansion.

## Summary

- Included matrix: 50 supported specs _ 7 models _ 2 passes = 700 expected tests
- Original public suite: 26 specs; expansion included: 24 of 25 new specs
- Quarantined expansion spec: `send_base_usdc_to_bob` because all 14 original tests failed before staging after observing Alice had 0 Base USDC
- JSON tests: 694; no-json tests: 6
- Strict passed tests: 629 / 700 (89.9%)
- JSON-only passed tests: 629 / 694 (90.6%)
- Hand-adjusted passed tests: 638 / 700 (91.1%) after crediting 9 clean staged/simulated tests that paused before `commit_txs`; see "Hand Adjustment" below.
- Hand-adjusted JSON-only passed tests: 638 / 694 (91.9%).

## Model Leaderboard

| Rank | Model          | Passed   | Failed JSON | No JSON | Strict Pass Rate | JSON Pass Rate | Credits  | Avg Sec | Median Sec | P95 Sec | Max Sec |
| ---- | -------------- | -------- | ----------- | ------- | ---------------- | -------------- | -------- | ------- | ---------- | ------- | ------- |
| 1    | `opus-4.6`     | 99 / 100 | 1           | 0       | 99.0%            | 99.0%          | 848.3959 | 40.0    | 32.5       | 93.2    | 326.6   |
| 2    | `opus-4.8`     | 97 / 100 | 2           | 1       | 97.0%            | 98.0%          | 734.5703 | 59.8    | 45.2       | 142.1   | 421.0   |
| 3    | `sonnet-4.6`   | 96 / 100 | 4           | 0       | 96.0%            | 96.0%          | 674.6333 | 48.0    | 42.2       | 91.8    | 351.1   |
| 4    | `gpt-5.5`      | 96 / 100 | 4           | 0       | 96.0%            | 96.0%          | 941.4127 | 28.0    | 25.0       | 54.7    | 108.7   |
| 5    | `opus-4.7`     | 91 / 100 | 5           | 4       | 91.0%            | 94.8%          | 670.3225 | 37.7    | 31.1       | 82.5    | 287.7   |
| 6    | `minimax-m2.5` | 76 / 100 | 23          | 1       | 76.0%            | 76.8%          | 179.0236 | 52.5    | 31.4       | 161.0   | 339.5   |
| 7    | `haiku-4.5`    | 74 / 100 | 26          | 0       | 74.0%            | 74.0%          | 228.0016 | 34.1    | 25.5       | 99.0    | 223.7   |

## Hand Adjustment

This section is a manual scoring lens, not raw harness output. It credits tests where the model had already staged the intended transaction and observed a passing simulation, but failed strict scoring only because it paused before `commit_txs`. This includes the high-value 10 ETH transfer cases where models followed the `$5k` confirmation rule instead of committing immediately. It does not credit tests with failed simulations, wrong route/tool arguments, guard-blocked transactions, timeouts/no-json, or fixture-funding failures.

| Rank | Model          | Raw Passed | Manual Credit | Adjusted Passed | Adjusted Failed JSON | No JSON | Adjusted Strict Pass Rate | Adjusted JSON Pass Rate |
| ---- | -------------- | ---------- | ------------- | --------------- | -------------------- | ------- | ------------------------- | ----------------------- |
| 1    | `opus-4.6`     | 99 / 100   | +0            | 99 / 100        | 1                    | 0       | 99.0%                     | 99.0%                   |
| 2    | `opus-4.8`     | 97 / 100   | +2            | 99 / 100        | 0                    | 1       | 99.0%                     | 100.0%                  |
| 3    | `sonnet-4.6`   | 96 / 100   | +2            | 98 / 100        | 2                    | 0       | 98.0%                     | 98.0%                   |
| 4    | `gpt-5.5`      | 96 / 100   | +1            | 97 / 100        | 3                    | 0       | 97.0%                     | 97.0%                   |
| 5    | `opus-4.7`     | 91 / 100   | +2            | 93 / 100        | 3                    | 4       | 93.0%                     | 96.9%                   |
| 6    | `haiku-4.5`    | 74 / 100   | +2            | 76 / 100        | 24                   | 0       | 76.0%                     | 76.0%                   |
| 7    | `minimax-m2.5` | 76 / 100   | +0            | 76 / 100        | 23                   | 1       | 76.0%                     | 76.8%                   |

Credited tests:

| Model        | Spec                      | Pass | Reason                                                                                                                   |
| ------------ | ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ |
| `gpt-5.5`    | `deposit_eth_renzo`       | 2    | Staged and simulated the Renzo 0.1 ETH deposit successfully, then asked for confirmation instead of committing.          |
| `opus-4.8`   | `transfer_eth_to_charlie` | 1    | Staged and simulated the 10 ETH transfer successfully, then paused because it exceeded the `$5k` confirmation threshold. |
| `opus-4.8`   | `transfer_eth_to_charlie` | 2    | Same as pass 1.                                                                                                          |
| `sonnet-4.6` | `transfer_eth_to_charlie` | 1    | Staged and simulated the 10 ETH transfer successfully, then paused because it exceeded the `$5k` confirmation threshold. |
| `sonnet-4.6` | `transfer_eth_to_charlie` | 2    | Same as pass 1.                                                                                                          |
| `opus-4.7`   | `transfer_eth_to_charlie` | 1    | Staged and simulated the 10 ETH transfer successfully, then paused because it exceeded the `$5k` confirmation threshold. |
| `opus-4.7`   | `transfer_eth_to_charlie` | 2    | Same as pass 1.                                                                                                          |
| `haiku-4.5`  | `transfer_eth_to_charlie` | 1    | Staged and simulated the 10 ETH transfer successfully, then paused because it exceeded the `$5k` confirmation threshold. |
| `haiku-4.5`  | `stake_eth_etherfi`       | 2    | Staged and simulated the ether.fi 0.1 ETH stake successfully, then asked for confirmation instead of committing.         |

## Usage And Cost

Per-test averages use each model's 100 supported tests as the denominator.

| Model          | Input      | Input / Test | Cached Input | Cached / Test | Cache % | Output  | Output / Test | Reasoning | Reasoning / Test | Tool Calls | Tool Calls / Test | Credits  | Credits / Passed Test |
| -------------- | ---------- | ------------ | ------------ | ------------- | ------- | ------- | ------------- | --------- | ---------------- | ---------- | ----------------- | -------- | --------------------- |
| `opus-4.6`     | 4,436,398  | 44,364       | 3,651,779    | 36,518        | 82.3%   | 109,399 | 1,094         | 0         | 0                | 533        | 5.3               | 848.3959 | 8.5697                |
| `opus-4.8`     | 4,444,176  | 44,442       | 3,612,706    | 36,127        | 81.3%   | 55,280  | 553           | 0         | 0                | 556        | 5.6               | 734.5703 | 7.5729                |
| `sonnet-4.6`   | 5,147,594  | 51,476       | 4,228,846    | 42,288        | 82.2%   | 181,429 | 1,814         | 0         | 0                | 588        | 5.9               | 674.6333 | 7.0274                |
| `gpt-5.5`      | 4,782,209  | 47,822       | 3,800,064    | 38,001        | 79.5%   | 86,779  | 868           | 10,759    | 108              | 625        | 6.2               | 941.4127 | 9.8064                |
| `opus-4.7`     | 4,028,882  | 40,289       | 3,251,730    | 32,517        | 80.7%   | 47,664  | 477           | 0         | 0                | 488        | 4.9               | 670.3225 | 7.3662                |
| `minimax-m2.5` | 11,652,127 | 116,521      | 0            | 0             | 0.0%    | 36,884  | 369           | 0         | 0                | 710        | 7.1               | 179.0236 | 2.3556                |
| `haiku-4.5`    | 5,687,835  | 56,878       | 4,768,343    | 47,683        | 83.8%   | 176,738 | 1,767         | 0         | 0                | 671        | 6.7               | 228.0016 | 3.0811                |

## Latency

| Model          | Tests With Timing | Total Sec | Avg Sec | Median Sec | P95 Sec | Max Sec |
| -------------- | ----------------- | --------- | ------- | ---------- | ------- | ------- |
| `opus-4.6`     | 100               | 4003.5    | 40.0    | 32.5       | 93.2    | 326.6   |
| `opus-4.8`     | 100               | 5980.8    | 59.8    | 45.2       | 142.1   | 421.0   |
| `sonnet-4.6`   | 100               | 4800.1    | 48.0    | 42.2       | 91.8    | 351.1   |
| `gpt-5.5`      | 100               | 2801.8    | 28.0    | 25.0       | 54.7    | 108.7   |
| `opus-4.7`     | 100               | 3767.3    | 37.7    | 31.1       | 82.5    | 287.7   |
| `minimax-m2.5` | 100               | 5249.6    | 52.5    | 31.4       | 161.0   | 339.5   |
| `haiku-4.5`    | 100               | 3407.1    | 34.1    | 25.5       | 99.0    | 223.7   |

Slowest specs by average elapsed time:

| Spec                                       | Timed Tests | Avg Sec | Max Sec |
| ------------------------------------------ | ----------- | ------- | ------- |
| `add_eth_usdc_lp_after_half_swap`          | 14          | 234.5   | 421.0   |
| `add_eth_usdc_v2_lp_after_half_swap`       | 14          | 123.6   | 269.4   |
| `supply_eth_then_borrow_usdc_aave_v3`      | 14          | 83.3    | 287.6   |
| `stake_then_request_steth_withdrawal`      | 14          | 82.7    | 321.1   |
| `swap_base_eth_for_usdc_aerodrome`         | 14          | 77.2    | 300.9   |
| `swap_eth_for_usdc_uniswap_v3`             | 14          | 76.9    | 125.7   |
| `stake_eth_mantle_meth`                    | 14          | 69.1    | 133.8   |
| `stake_then_wrap_steth_to_wsteth`          | 14          | 65.8    | 145.5   |
| `swap_eth_for_usdc_sushiswap`              | 14          | 60.1    | 145.1   |
| `deposit_eth_renzo`                        | 14          | 57.9    | 283.4   |
| `deposit_usdc_yvusdc_yearn`                | 14          | 56.6    | 83.0    |
| `supply_then_withdraw_usdc_compound_v3`    | 14          | 53.9    | 71.8    |
| `supply_usdc_aave_v3_ethereum`             | 14          | 52.6    | 170.6   |
| `bridge_eth_to_zksync_native_review_first` | 14          | 49.7    | 69.6    |
| `bridge_usdc_to_base_cctp_review_first`    | 14          | 48.8    | 79.1    |

## Included Specs

| #   | Spec                                         | Group                 |
| --- | -------------------------------------------- | --------------------- |
| 1   | `check_base_usdc_balance`                    | original public suite |
| 2   | `check_zora_token_balance`                   | original public suite |
| 3   | `swap_base_eth_for_usdc_aerodrome`           | original public suite |
| 4   | `swap_eth_for_steth_curve`                   | original public suite |
| 5   | `swap_eth_for_usdc_sushiswap`                | original public suite |
| 6   | `swap_eth_for_usdc_uniswap_v3`               | original public suite |
| 7   | `deposit_eth_aave_v3_ethereum`               | original public suite |
| 8   | `supply_usdc_compound_v3`                    | original public suite |
| 9   | `needs_market_before_supply_usdc`            | original public suite |
| 10  | `check_krexa_credit_line`                    | original public suite |
| 11  | `deposit_steth_strategy_review_first`        | original public suite |
| 12  | `stake_eth_etherfi`                          | original public suite |
| 13  | `deposit_eth_kelp`                           | original public suite |
| 14  | `stake_eth_lido`                             | original public suite |
| 15  | `stake_eth_mantle_meth`                      | original public suite |
| 16  | `deposit_eth_renzo`                          | original public suite |
| 17  | `stake_eth_rocket_pool`                      | original public suite |
| 18  | `deposit_usdc_yvusdc_yearn`                  | original public suite |
| 19  | `bridge_eth_to_base_native_review_first`     | original public suite |
| 20  | `bridge_usdc_to_base_cctp_review_first`      | original public suite |
| 21  | `bridge_eth_to_optimism_native_review_first` | original public suite |
| 22  | `bridge_eth_to_zksync_native_review_first`   | original public suite |
| 23  | `convex_requires_curve_lp_first`             | original public suite |
| 24  | `oneinch_requires_api_calldata`              | original public suite |
| 25  | `pendle_requires_approx_params`              | original public suite |
| 26  | `check_eth_perp_before_open`                 | original public suite |
| 27  | `base_eth_balance_check`                     | expansion supported   |
| 28  | `transfer_base_eth_to_recipient`             | expansion supported   |
| 29  | `transfer_eth_to_charlie`                    | expansion supported   |
| 30  | `transfer_usdc_to_bob`                       | expansion supported   |
| 31  | `eip712_login_signature_request`             | expansion supported   |
| 32  | `supply_usdc_aave_v3_ethereum`               | expansion supported   |
| 33  | `supply_eth_then_borrow_usdc_aave_v3`        | expansion supported   |
| 34  | `add_eth_usdc_lp_after_half_swap`            | expansion supported   |
| 35  | `supply_then_withdraw_usdc_compound_v3`      | expansion supported   |
| 36  | `stake_then_wrap_steth_to_wsteth`            | expansion supported   |
| 37  | `stake_then_request_steth_withdrawal`        | expansion supported   |
| 38  | `add_eth_usdc_v2_lp_after_half_swap`         | expansion supported   |
| 39  | `across_routes`                              | expansion supported   |
| 40  | `bybit_eth_orderbook`                        | expansion supported   |
| 41  | `cow_swap_quote`                             | expansion supported   |
| 42  | `defillama_protocol_tvl`                     | expansion supported   |
| 43  | `dydx_markets`                               | expansion supported   |
| 44  | `gmx_prices`                                 | expansion supported   |
| 45  | `lifi_chains`                                | expansion supported   |
| 46  | `manifold_search`                            | expansion supported   |
| 47  | `okx_tickers`                                | expansion supported   |
| 48  | `polymarket_rewards_find`                    | expansion supported   |
| 49  | `polymarket_search`                          | expansion supported   |
| 50  | `zora_profile`                               | expansion supported   |

## Expansion Result By Spec

| Spec                                    | Passed / 14 | Failed JSON | No JSON | Include? |
| --------------------------------------- | ----------- | ----------- | ------- | -------- |
| `base_eth_balance_check`                | 14 / 14     | 0           | 0       | yes      |
| `transfer_base_eth_to_recipient`        | 14 / 14     | 0           | 0       | yes      |
| `transfer_eth_to_charlie`               | 7 / 14      | 7           | 0       | yes      |
| `transfer_usdc_to_bob`                  | 12 / 14     | 2           | 0       | yes      |
| `eip712_login_signature_request`        | 14 / 14     | 0           | 0       | yes      |
| `supply_usdc_aave_v3_ethereum`          | 12 / 14     | 2           | 0       | yes      |
| `supply_eth_then_borrow_usdc_aave_v3`   | 12 / 14     | 2           | 0       | yes      |
| `add_eth_usdc_lp_after_half_swap`       | 8 / 14      | 5           | 1       | yes      |
| `supply_then_withdraw_usdc_compound_v3` | 14 / 14     | 0           | 0       | yes      |
| `stake_then_wrap_steth_to_wsteth`       | 12 / 14     | 2           | 0       | yes      |
| `stake_then_request_steth_withdrawal`   | 8 / 14      | 5           | 1       | yes      |
| `add_eth_usdc_v2_lp_after_half_swap`    | 11 / 14     | 3           | 0       | yes      |
| `across_routes`                         | 14 / 14     | 0           | 0       | yes      |
| `bybit_eth_orderbook`                   | 14 / 14     | 0           | 0       | yes      |
| `cow_swap_quote`                        | 14 / 14     | 0           | 0       | yes      |
| `defillama_protocol_tvl`                | 14 / 14     | 0           | 0       | yes      |
| `dydx_markets`                          | 14 / 14     | 0           | 0       | yes      |
| `gmx_prices`                            | 14 / 14     | 0           | 0       | yes      |
| `lifi_chains`                           | 14 / 14     | 0           | 0       | yes      |
| `manifold_search`                       | 14 / 14     | 0           | 0       | yes      |
| `okx_tickers`                           | 14 / 14     | 0           | 0       | yes      |
| `polymarket_rewards_find`               | 14 / 14     | 0           | 0       | yes      |
| `polymarket_search`                     | 14 / 14     | 0           | 0       | yes      |
| `zora_profile`                          | 14 / 14     | 0           | 0       | yes      |

## Two-Pass Stability

| Model          | Both Pass | Split 1/2 | Zero Pass |
| -------------- | --------- | --------- | --------- |
| `opus-4.6`     | 49        | 1         | 0         |
| `opus-4.8`     | 48        | 1         | 1         |
| `sonnet-4.6`   | 47        | 2         | 1         |
| `gpt-5.5`      | 47        | 2         | 1         |
| `opus-4.7`     | 42        | 7         | 1         |
| `minimax-m2.5` | 35        | 6         | 9         |
| `haiku-4.5`    | 34        | 6         | 10        |

Split-pass cases:

| Model          | Spec                                       | Pass 1  | Pass 2  |
| -------------- | ------------------------------------------ | ------- | ------- |
| `gpt-5.5`      | `deposit_steth_strategy_review_first`      | fail    | pass    |
| `gpt-5.5`      | `deposit_eth_renzo`                        | pass    | fail    |
| `opus-4.8`     | `add_eth_usdc_lp_after_half_swap`          | pass    | no_json |
| `sonnet-4.6`   | `add_eth_usdc_lp_after_half_swap`          | fail    | pass    |
| `sonnet-4.6`   | `stake_then_request_steth_withdrawal`      | fail    | pass    |
| `opus-4.7`     | `check_zora_token_balance`                 | pass    | fail    |
| `opus-4.7`     | `swap_eth_for_usdc_sushiswap`              | pass    | fail    |
| `opus-4.7`     | `deposit_steth_strategy_review_first`      | fail    | pass    |
| `opus-4.7`     | `deposit_eth_kelp`                         | no_json | pass    |
| `opus-4.7`     | `stake_eth_mantle_meth`                    | no_json | pass    |
| `opus-4.7`     | `deposit_eth_renzo`                        | pass    | no_json |
| `opus-4.7`     | `stake_then_request_steth_withdrawal`      | no_json | pass    |
| `opus-4.6`     | `swap_eth_for_usdc_uniswap_v3`             | fail    | pass    |
| `haiku-4.5`    | `swap_eth_for_usdc_uniswap_v3`             | fail    | pass    |
| `haiku-4.5`    | `stake_eth_etherfi`                        | pass    | fail    |
| `haiku-4.5`    | `bridge_eth_to_zksync_native_review_first` | fail    | pass    |
| `haiku-4.5`    | `transfer_eth_to_charlie`                  | fail    | pass    |
| `haiku-4.5`    | `transfer_usdc_to_bob`                     | pass    | fail    |
| `haiku-4.5`    | `add_eth_usdc_v2_lp_after_half_swap`       | fail    | pass    |
| `minimax-m2.5` | `check_zora_token_balance`                 | fail    | pass    |
| `minimax-m2.5` | `swap_base_eth_for_usdc_aerodrome`         | no_json | pass    |
| `minimax-m2.5` | `swap_eth_for_usdc_uniswap_v3`             | pass    | fail    |
| `minimax-m2.5` | `deposit_eth_aave_v3_ethereum`             | fail    | pass    |
| `minimax-m2.5` | `deposit_usdc_yvusdc_yearn`                | pass    | fail    |
| `minimax-m2.5` | `transfer_usdc_to_bob`                     | fail    | pass    |

Zero-pass cases:

| Model          | Spec                                  | Outcomes  |
| -------------- | ------------------------------------- | --------- |
| `gpt-5.5`      | `check_zora_token_balance`            | fail,fail |
| `opus-4.8`     | `transfer_eth_to_charlie`             | fail,fail |
| `sonnet-4.6`   | `transfer_eth_to_charlie`             | fail,fail |
| `opus-4.7`     | `transfer_eth_to_charlie`             | fail,fail |
| `haiku-4.5`    | `swap_base_eth_for_usdc_aerodrome`    | fail,fail |
| `haiku-4.5`    | `supply_usdc_compound_v3`             | fail,fail |
| `haiku-4.5`    | `deposit_steth_strategy_review_first` | fail,fail |
| `haiku-4.5`    | `deposit_eth_kelp`                    | fail,fail |
| `haiku-4.5`    | `stake_eth_lido`                      | fail,fail |
| `haiku-4.5`    | `deposit_eth_renzo`                   | fail,fail |
| `haiku-4.5`    | `stake_eth_rocket_pool`               | fail,fail |
| `haiku-4.5`    | `add_eth_usdc_lp_after_half_swap`     | fail,fail |
| `haiku-4.5`    | `stake_then_wrap_steth_to_wsteth`     | fail,fail |
| `haiku-4.5`    | `stake_then_request_steth_withdrawal` | fail,fail |
| `minimax-m2.5` | `supply_usdc_compound_v3`             | fail,fail |
| `minimax-m2.5` | `deposit_steth_strategy_review_first` | fail,fail |
| `minimax-m2.5` | `deposit_eth_kelp`                    | fail,fail |
| `minimax-m2.5` | `deposit_eth_renzo`                   | fail,fail |
| `minimax-m2.5` | `supply_usdc_aave_v3_ethereum`        | fail,fail |
| `minimax-m2.5` | `supply_eth_then_borrow_usdc_aave_v3` | fail,fail |
| `minimax-m2.5` | `add_eth_usdc_lp_after_half_swap`     | fail,fail |
| `minimax-m2.5` | `stake_then_request_steth_withdrawal` | fail,fail |
| `minimax-m2.5` | `add_eth_usdc_v2_lp_after_half_swap`  | fail,fail |

## Failure Taxonomy

| Category           | Tests |
| ------------------ | ----- |
| `tool_error`       | 38    |
| `assertion_failed` | 27    |
| `no_json`          | 6     |

Top failed assertion labels:

| Label                                                   | Count |
| ------------------------------------------------------- | ----- |
| `tool`                                                  | 38    |
| `callback_observed`                                     | 21    |
| `wallet_event_observed`                                 | 8     |
| `charlie ETH delta 10`                                  | 7     |
| `no_json`                                               | 6     |
| `Alice receives ezETH from Renzo`                       | 5     |
| `Alice spends about 1 Base ETH total`                   | 5     |
| `Base USDC moved for swap and LP`                       | 5     |
| `Aerodrome WETH/USDC LP token minted`                   | 5     |
| `stETH Transfer events for mint and withdrawal request` | 5     |
| `Alice receives rsETH from Kelp`                        | 4     |
| `Alice supplies about 100 USDC to Compound`             | 4     |
| `USDC Transfer log into Compound`                       | 4     |
| `Base WETH moved into Aerodrome LP`                     | 4     |
| `Alice spends about 0.05 ETH on the Uniswap swap`       | 3     |
| `USDC Transfer log from Uniswap swap`                   | 3     |
| `Alice spends about 1 ETH total on swap plus LP`        | 3     |
| `Ethereum USDC moved for swap and LP`                   | 3     |
| `Uniswap V2 WETH/USDC LP token minted`                  | 3     |
| `Alice spends about 0.1 ETH before receiving wstETH`    | 2     |
| `wstETH Transfer event from wrap`                       | 2     |
| `Alice borrows about 100 USDC from Aave V3`             | 2     |
| `USDC Transfer from Aave borrow`                        | 2     |
| `Alice supplies about 100 USDC to Aave V3`              | 2     |
| `USDC Transfer into Aave V3`                            | 2     |
| `Aave aUSDC minted`                                     | 2     |
| `Alice spends about 0.05 Base ETH on Aerodrome`         | 2     |
| `Base USDC Transfer log from Aerodrome swap`            | 2     |
| `Alice receives about 0.1 stETH`                        | 2     |
| `Alice spends about 0.1 ETH staking with Rocket Pool`   | 2     |
| `Rocket Pool rETH Transfer log`                         | 2     |

## No-JSON / Harness Tests

| Model          | Spec                                  | Pass | Kind      | Elapsed Sec | Evidence                                                                                                                           |
| -------------- | ------------------------------------- | ---- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `opus-4.8`     | `add_eth_usdc_lp_after_half_swap`     | 2    | `timeout` | 421.0       | [eval] ERROR after 420s timed out waiting for eval spec turn after 420s                                                            |
| `opus-4.7`     | `deposit_eth_kelp`                    | 1    | `no_json` | 47.6        | [eval] ERROR after 46s failed to auto-approve local pending tx 1 eth_sendTransaction JSON-RPC error -32000: intrinsic gas too low  |
| `opus-4.7`     | `deposit_eth_renzo`                   | 2    | `timeout` | 283.4       | [eval] ERROR after 282s failed to auto-approve local pending tx 1 eth_sendTransaction JSON-RPC error -32000: intrinsic gas too low |
| `opus-4.7`     | `stake_eth_mantle_meth`               | 1    | `no_json` | 52.5        | [eval] ERROR after 51s failed to auto-approve local pending tx 1 eth_sendTransaction JSON-RPC error -32000: intrinsic gas too low  |
| `opus-4.7`     | `stake_then_request_steth_withdrawal` | 1    | `no_json` | 56.9        | [eval] ERROR after 56s failed to auto-approve local pending tx 2 eth_sendTransaction JSON-RPC error -32000: intrinsic gas too low  |
| `minimax-m2.5` | `swap_base_eth_for_usdc_aerodrome`    | 1    | `timeout` | 300.9       | [eval] ERROR after 300s timed out waiting for eval spec turn after 300s                                                            |

## Notes

- This report keeps the old public-suite results and adds the 2026-05-31 expansion run.
- `send_base_usdc_to_bob` remains excluded from the supported denominator because the earlier expansion run showed it tested fixture funding rather than model capability.

## Artifacts

- Canonical report: `output/eval/aomi-bench-v0.1/README.md`
- Benchmark suite JSON: `output/eval/aomi-bench-v0.1/suite.json`
- Native full summary JSON: `output/eval/aomi-bench-v0.1/summary.full.json`
- Native compact summary JSON: `output/eval/aomi-bench-v0.1/summary.compact.json`
- Native latest snapshot JSON: `output/eval/aomi-bench-v0.1/latest.json`
- Timestamped native summaries: `output/eval/aomi-bench-v0.1/summaries/`
- Merged leaf run outputs: `output/eval/aomi-bench-v0.1/specs/`
- Preserved source reports and resume logs: `output/eval/aomi-bench-v0.1/run-logs/`
