/**
 * Records one master take per scenario.
 *
 * Requires @playwright/test (see demo/README.md). Nothing else in demo/ depends
 * on Playwright, so the fork orchestration in test-env.ts is usable and
 * testable without it.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
// @playwright/test re-exports the driver; importing from "playwright" would rely
// on a transitive dep that pnpm does not hoist.
import { chromium, type Browser } from "@playwright/test";

import { sel } from "./selectors";
import {
  assertForkedOrDie,
  blockNumber,
  readForkedChains,
  resetChain,
  toRpcMap,
  type ForkedChain,
} from "./test-env";
import type {
  CaptureResult,
  Marker,
  MarkerName,
  Scenario,
} from "../scenarios/types";

const OUT_DIR = join(process.cwd(), "demo", "out");
const PORTAL_URL = process.env.PORTAL_URL ?? "http://localhost:3000";

/**
 * Seeding the portal's E2E wallet is what keeps extension popups and seed
 * phrases off camera: it mints a cookie the portal reads server-side, so the
 * wallet is already "connected" when the page first paints.
 *
 * Requires AOMI_ENABLE_E2E_WALLET=true and a matching AOMI_E2E_WALLET_TOKEN in
 * the portal's env — and note that isE2EWalletEnabled() also demands VERCEL_ENV
 * be UNSET, which a copied .env.local will usually violate.
 */
const E2E_TOKEN = process.env.AOMI_E2E_WALLET_TOKEN ?? "";
/** Anvil account 0, the faucet `test-env evm up` pre-funds. */
const E2E_ADDRESS =
  process.env.AOMI_E2E_ADDRESS ?? "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function seedUrl(chainId: number): string {
  const url = new URL("/api/bff/e2e/wallet", PORTAL_URL);
  url.searchParams.set("token", E2E_TOKEN);
  url.searchParams.set("address", E2E_ADDRESS);
  url.searchParams.set("chainId", String(chainId));
  url.searchParams.set("redirect", "/");
  return url.toString();
}

/** Typing delay per character. Fast enough not to bore, slow enough to read. */
const TYPING_DELAY_MS = 45;

class MarkerLog {
  private readonly startedAt = Date.now();
  private readonly markers: Marker[] = [];

  mark(name: MarkerName): void {
    this.markers.push({ name, offsetMs: Date.now() - this.startedAt });
  }

  all(): Marker[] {
    return [...this.markers];
  }
}

/**
 * Did the chain actually move during this take?
 *
 * An earlier version of this watched the BROWSER for requests to the fork port.
 * That was wrong, and it failed every take: the agent's tools execute
 * server-side (backend + BFF executor), so the page legitimately never contacts
 * the fork. Block height is observable from here and cannot be faked by env
 * vars being set in the wrong shell.
 *
 * Only meaningful for scenarios that execute — a read-only turn mines nothing,
 * which is why this is keyed off `scenario.expectsExecution` rather than being
 * applied blindly.
 */
async function forkProgress(chains: readonly ForkedChain[]) {
  const before = await Promise.all(chains.map(blockNumber));
  return {
    async settle(): Promise<{ advanced: boolean; detail: string }> {
      const after = await Promise.all(chains.map(blockNumber));
      const detail = chains
        .map((c, i) => `chain ${c.chainId}: ${before[i]} -> ${after[i]}`)
        .join(", ");
      return { advanced: after.some((n, i) => n > (before[i] ?? 0)), detail };
    },
  };
}

async function runScenario(
  browser: Browser,
  scenario: Scenario,
  chains: readonly ForkedChain[],
): Promise<CaptureResult> {
  const scenarioOut = join(OUT_DIR, scenario.id);
  await mkdir(scenarioOut, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina master; social crops stay sharp
    recordVideo: { dir: scenarioOut, size: { width: 1440, height: 900 } },
  });

  const markers = new MarkerLog();
  const page = await context.newPage();
  const progress = await forkProgress(chains);

  try {
    if (E2E_TOKEN) {
      const seeded = await page.goto(seedUrl(scenario.chains[0] ?? 1), {
        waitUntil: "domcontentloaded",
      });
      if (seeded && seeded.status() >= 400) {
        throw new Error(
          `E2E wallet seeding failed with HTTP ${seeded.status()}: ` +
            `${await seeded.text()}\n` +
            `Check AOMI_ENABLE_E2E_WALLET, AOMI_E2E_WALLET_TOKEN, and that ` +
            `VERCEL_ENV is unset in the portal's env.`,
        );
      }
    } else {
      await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" });
    }

    // Thread hydration; the composer exists before it is usable.
    await page
      .locator(sel.loading)
      .waitFor({ state: "detached", timeout: 60_000 })
      .catch(() => {
        // Already hydrated — the spinner may never have rendered.
      });
    // The consent banner overlaps the composer and would sit in every frame.
    // Decline rather than accept — no reason a recording studio opts into
    // tracking. It mounts lazily (it appeared AFTER this point and intercepted
    // a mid-take click once), so this is a repeatable guard, not a one-shot.
    const dismissConsent = async () => {
      const decline = page.getByRole("button", { name: /decline/i }).first();
      if (await decline.isVisible().catch(() => false)) {
        await decline.click();
        await decline
          .waitFor({ state: "hidden", timeout: 5_000 })
          .catch(() => {});
      }
    };
    await dismissConsent();

    await page.locator(sel.composer).waitFor({ state: "visible" });
    markers.mark("page-ready");

    for (const prompt of scenario.prompts) {
      await dismissConsent();
      const composer = page.locator(sel.composer);
      await composer.click();
      await composer.pressSequentially(prompt, { delay: TYPING_DELAY_MS });
      // Take 7 lost its first keystroke to hydration ("~~S~~take half…"), and a
      // typo'd prompt is on camera forever. Verify; retype once if mangled.
      const typed = await composer.inputValue().catch(() => null);
      if (typed !== null && typed !== prompt) {
        await composer.fill("");
        await composer.pressSequentially(prompt, { delay: TYPING_DELAY_MS });
      }
      markers.mark("prompt-typed");

      await page.locator(sel.send).click();
      markers.mark("prompt-submitted");

      // Wait on real UI state, never a sleep: the stop button exists only
      // while the turn is streaming.
      await page
        .locator(sel.streaming)
        .waitFor({ state: "visible", timeout: 30_000 });

      await page
        .locator(sel.workingTrace)
        .first()
        .waitFor({ state: "visible", timeout: scenario.timeoutMs ?? 180_000 })
        .then(() => markers.mark("trace-appeared"))
        .catch(() => {
          // Some turns answer without a tool trace; not fatal.
        });

      await page.locator(sel.streaming).waitFor({
        state: "detached",
        timeout: scenario.timeoutMs ?? 180_000,
      });
      markers.mark("response-complete");
    }

    // Execution callbacks (wallet:tx_complete) trigger a FOLLOW-UP agent turn
    // after the approval turn "completes" — take 13 cut mid-sentence of the
    // final confirmation because of this. Keep recording while any new turn
    // starts within a grace window, so the take ends on a settled screen.
    for (;;) {
      const followUp = await page
        .locator(sel.streaming)
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!followUp) break;
      await page.locator(sel.streaming).waitFor({
        state: "detached",
        timeout: scenario.timeoutMs ?? 180_000,
      });
      markers.mark("response-complete");
    }
    // Two beats of stillness so the cut doesn't land on the last keyframe.
    await page.waitForTimeout(2_000);

    const finalMessage =
      (await page.locator(sel.assistantMessage).last().innerText()) ?? "";

    // Broadcast can trail the final token by several seconds, so poll rather
    // than sampling the instant streaming stops — an execution take should not
    // fail because the tx was still in the mempool when we looked.
    let settled = await progress.settle();
    if (scenario.expectsExecution && !settled.advanced) {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline && !settled.advanced) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        settled = await progress.settle();
      }
    }
    if (scenario.expectsExecution && !settled.advanced) {
      throw new Error(
        `Scenario "${scenario.id}" declares expectsExecution but the fork never ` +
          `mined a block (${settled.detail}). Nothing was executed on-chain, so ` +
          `this take is not a usable demo.`,
      );
    }
    console.log(`fork blocks: ${settled.detail}`);

    const video = page.video();
    await context.close(); // video is only finalized on context close
    const videoPath = (await video?.path()) ?? "";

    const result: CaptureResult = {
      scenarioId: scenario.id,
      videoPath,
      markers: markers.all(),
      finalMessage,
    };
    await writeFile(
      join(scenarioOut, "markers.json"),
      JSON.stringify(result, null, 2),
      "utf8",
    );
    return result;
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function main(): Promise<void> {
  const scenarioId = process.argv[2];
  if (!scenarioId) {
    throw new Error("Usage: tsx demo/capture/record.ts <scenario-id>");
  }

  const { scenario } = (await import(
    `../scenarios/${scenarioId}.scenario.ts`
  )) as { scenario: Scenario };

  const chains = await readForkedChains();
  await assertForkedOrDie(chains);

  console.log(
    `Portal must be running with:\n` +
      `  NEXT_PUBLIC_USE_FULL_TESTNET=true\n` +
      `  NEXT_PUBLIC_FULL_TESTNET_RPC_MAP='${toRpcMap(chains)}'\n`,
  );
  console.log(
    scenario.apps.length
      ? `Backend must expose exactly these apps: ${scenario.apps.join(", ")}\n`
      : `Scenario needs no SDK apps (built-in skills only).\n`,
  );

  // Identical starting state for every take. Reset REFORKS the chain, which
  // wipes any prior funding — so fund after, never before (take 10 read a
  // default 10,000 ETH balance because funding preceded the reset, and the
  // agent dutifully proposed staking 5,000 ETH on camera).
  for (const chainId of scenario.chains) {
    await resetChain(chainId);
  }
  const funded = await readForkedChains(); // ports can change across resets
  await assertForkedOrDie(funded);
  for (const chain of funded) {
    await fetch(chain.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "anvil_setBalance",
        // 10 ETH: enough to demo, small enough to look like a person.
        params: [E2E_ADDRESS, "0x8AC7230489E80000"],
      }),
    });
  }

  const browser = await chromium.launch();
  try {
    const result = await runScenario(browser, scenario, chains);
    console.log(`Recorded ${result.scenarioId} -> ${result.videoPath}`);
    for (const marker of result.markers) {
      console.log(`  ${String(marker.offsetMs).padStart(7)}ms  ${marker.name}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
