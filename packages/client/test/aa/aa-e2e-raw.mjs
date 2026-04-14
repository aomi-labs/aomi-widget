/**
 * E2E: send a real sponsored batch that shows up on the Alchemy dashboard.
 *
 * Uses @alchemy/wallet-apis v5 (Wallets API), not the older raw bundler flow.
 *
 * This script sends exactly 2 calls in one batch:
 * - 7702: defaults to the signer address as the executing account
 * - 4337: requests a non-7702 smart account first, then sends from that account
 *
 * By default the calls are self-calls with 0 value. That is enough to create a real
 * sponsored AA operation that shows up in Gas Manager / Wallets usage.
 *
 * Usage:
 *   ALCHEMY_API_KEY=... \
 *   ALCHEMY_GAS_POLICY_ID=... \
 *   PRIVATE_KEY=0x... \
 *   MODE=7702 \
 *   node test/aa-e2e-raw.mjs
 *
 * Supported MODE values:
 *   7702 | 4337 | both
 *
 * Optional:
 *   ACCOUNT_ID=custom-id    optional account id for the 4337 requestAccount flow
 */
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  createSmartWalletClient,
  alchemyWalletTransport,
} from "@alchemy/wallet-apis";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const API_KEY = process.env.ALCHEMY_API_KEY;
const GAS_POLICY_ID = process.env.ALCHEMY_GAS_POLICY_ID;
const MODE = (process.env.MODE ?? "7702").toLowerCase();
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const SELF_VALUE_WEI = 0n;

if (!PRIVATE_KEY || !API_KEY || !GAS_POLICY_ID) {
  console.error("Required: PRIVATE_KEY, ALCHEMY_API_KEY, ALCHEMY_GAS_POLICY_ID");
  process.exit(1);
}

if (!["7702", "4337", "both"].includes(MODE)) {
  console.error(`Unsupported MODE="${MODE}". Use 7702, 4337, or both.`);
  process.exit(1);
}

const signer = privateKeyToAccount(PRIVATE_KEY);
const chain = mainnet;
const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${API_KEY}`;
const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

function makeClient() {
  return createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: API_KEY }),
    chain,
    signer,
    paymaster: { policyId: GAS_POLICY_ID },
  });
}

async function runMode(mode) {
  const walletClient = makeClient();
  let account;

  if (mode === "4337") {
    account = await walletClient.requestAccount(
      ACCOUNT_ID ? { id: ACCOUNT_ID } : undefined,
    );
  }

  const senderAddress = account?.address ?? signer.address;
  const recipient = senderAddress;
  const senderBalanceBefore = await publicClient.getBalance({ address: senderAddress });
  const recipientBalanceBefore = await publicClient.getBalance({ address: recipient });

  console.log("");
  console.log(`mode: ${mode}`);
  console.log(`chain: ${chain.name} (${chain.id})`);
  console.log(`signer: ${signer.address}`);
  console.log(`sender: ${senderAddress}`);
  console.log(`recipient: ${recipient}`);
  console.log(`value per call: ${SELF_VALUE_WEI.toString()} wei`);
  console.log("sending 2-call batch...");

  const result = await walletClient.sendCalls({
    ...(account ? { account: account.address } : {}),
    calls: [
      { to: recipient, data: "0x", value: SELF_VALUE_WEI },
      { to: recipient, data: "0x", value: SELF_VALUE_WEI },
    ],
  });

  console.log(`call id: ${result.id}`);
  const status = await walletClient.waitForCallsStatus({ id: result.id });
  console.log(`status: ${status.status}`);

  const receipt = status.receipts?.[0];
  if (!receipt?.transactionHash) {
    console.error("No transaction hash returned.");
    process.exit(1);
  }

  const senderBalanceAfter = await publicClient.getBalance({ address: senderAddress });
  const recipientBalanceAfter = await publicClient.getBalance({ address: recipient });

  console.log(`tx hash: ${receipt.transactionHash}`);
  console.log(`block: ${receipt.blockNumber}`);
  console.log(`gas used: ${receipt.gasUsed}`);
  console.log(`sender balance before: ${senderBalanceBefore.toString()}`);
  console.log(`sender balance after:  ${senderBalanceAfter.toString()}`);
  console.log(`recipient balance before: ${recipientBalanceBefore.toString()}`);
  console.log(`recipient balance after:  ${recipientBalanceAfter.toString()}`);

  return {
    mode,
    callId: result.id,
    txHash: receipt.transactionHash,
    senderAddress,
    recipient,
  };
}

const modes = MODE === "both" ? ["7702", "4337"] : [MODE];
const results = [];
for (const mode of modes) {
  results.push(await runMode(mode));
}

console.log("");
console.log("done");
for (const item of results) {
  console.log(`${item.mode}: ${item.txHash} (${item.callId})`);
}
