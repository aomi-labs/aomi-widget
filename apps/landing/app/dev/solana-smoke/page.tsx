"use client";

// =============================================================================
// Solana sign smoke — Ladder 1
// =============================================================================
//
// Easiest verification: skips backend + AomiRuntimeProvider entirely. Just
// exercises the `AomiAuthAdapter.signSolanaTransaction` contract end to end.
//
// What this proves:
//   - The discriminated `WalletSolanaSignPayload` type is shaped correctly
//   - A `signSolanaTransaction` implementation runs in the browser
//   - The result has a `signedTx` string (base64 of the signed bytes)
//   - With Phantom mode, real cryptographic signing works end to end
//
// What this does NOT prove (covered by unit tests + once BE is ready):
//   - SDK queue → RuntimeTxHandler dispatch
//   - Session.resolve posting `wallet::solana_sign_complete` to the host
//   - The full chat → svm_sign_tx → submit roundtrip
//
// Visit `/dev/solana-smoke` to run. Watch the on-page log + DevTools console.

import { useEffect, useState } from "react";
import type { WalletSolanaSignPayload } from "@aomi-labs/react";
import type { AomiAuthAdapter } from "../../../../registry/src/lib/aomi-auth-adapter";

// -----------------------------------------------------------------------------
// Two adapter modes
// -----------------------------------------------------------------------------

type Mode = "mock" | "phantom";

type SignFn = NonNullable<AomiAuthAdapter["signSolanaTransaction"]>;

/**
 * Mock signer — no Phantom needed. Returns a deterministic
 * `SIGNED:<unsignedTx>` string so you can eyeball the round-trip
 * without installing a wallet.
 */
const mockSign: SignFn = async (payload: WalletSolanaSignPayload) => {
  console.log("[smoke/mock] signSolanaTransaction received", payload);
  await new Promise((r) => setTimeout(r, 150)); // simulate async wallet UX
  const signedTx = `SIGNED:${payload.unsignedTx ?? ""}`;
  console.log("[smoke/mock] returning signedTx", signedTx.slice(0, 48));
  return { signedTx };
};

/**
 * Phantom signer — uses `window.solana` directly (no @solana/wallet-adapter
 * needed for this smoke). Requires Phantom extension + a connected session.
 *
 * Tries versioned-tx first, falls back to legacy. Mirrors what the CLI does.
 */
const phantomSign: SignFn = async (payload: WalletSolanaSignPayload) => {
  console.log("[smoke/phantom] signSolanaTransaction received", payload);

  const w = window as typeof window & {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toBase58(): string };
      connect: () => Promise<{ publicKey: { toBase58(): string } }>;
      signTransaction: (tx: unknown) => Promise<{ serialize: () => Uint8Array }>;
    };
  };
  if (!w.solana?.isPhantom) {
    throw new Error("Phantom not detected. Install the Phantom extension.");
  }
  if (!payload.unsignedTx) {
    throw new Error("payload.unsignedTx is required");
  }

  await w.solana.connect();
  console.log("[smoke/phantom] connected", w.solana.publicKey?.toBase58());

  // Defer-import @solana/web3.js so dev pages without Solana usage don't pay
  // the bundle cost. This keeps the mock-only path zero-dep.
  const { VersionedTransaction, Transaction } = await import("@solana/web3.js");
  const bytes = Uint8Array.from(atob(payload.unsignedTx), (c) => c.charCodeAt(0));

  let signed: { serialize: () => Uint8Array };
  try {
    const tx = VersionedTransaction.deserialize(bytes);
    signed = (await w.solana.signTransaction(tx)) as { serialize: () => Uint8Array };
  } catch {
    const tx = Transaction.from(bytes);
    signed = (await w.solana.signTransaction(tx)) as { serialize: () => Uint8Array };
  }

  const signedBytes = signed.serialize();
  let bin = "";
  for (const b of signedBytes) bin += String.fromCharCode(b);
  const signedTx = btoa(bin);

  console.log("[smoke/phantom] signedTx", signedTx.slice(0, 48), `(${signedTx.length} chars)`);
  return { signedTx };
};

// -----------------------------------------------------------------------------
// Hardcoded smoke fixture
// -----------------------------------------------------------------------------
//
// In mock mode this is opaque — the mock just echoes it. In Phantom mode this
// would need to be a real serialized Solana tx for `signTransaction` to
// succeed. We use a tiny legacy-tx fixture built at runtime in Phantom mode;
// in mock mode any string works.

function buildMockUnsignedTxBase64(): string {
  // Trivial opaque payload — bytes don't have to deserialize for mock mode.
  return btoa("smoke-test-unsigned-tx-fixture");
}

async function buildPhantomUnsignedTxBase64(): Promise<string> {
  // Real legacy tx with no instructions, placeholder blockhash, fee payer =
  // Phantom's connected pubkey. Phantom will accept this for `signTransaction`
  // but the bytes won't broadcast successfully (blockhash is fake).
  const w = window as typeof window & {
    solana?: { connect: () => Promise<{ publicKey: { toBase58(): string } }> };
  };
  const conn = await w.solana!.connect();
  const { Transaction, PublicKey } = await import("@solana/web3.js");
  const { default: bs58 } = await import("bs58");
  const blockhash = bs58.encode(new Uint8Array(32));
  const tx = new Transaction({
    feePayer: new PublicKey(conn.publicKey.toBase58()),
    recentBlockhash: blockhash,
  });
  const bytes = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------

type LogEntry = { ts: number; level: "info" | "ok" | "err"; text: string };

export default function SolanaSmokePage() {
  const [mode, setMode] = useState<Mode>("mock");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [phantomDetected, setPhantomDetected] = useState(false);

  useEffect(() => {
    const w = window as typeof window & { solana?: { isPhantom?: boolean } };
    setPhantomDetected(Boolean(w.solana?.isPhantom));
  }, []);

  const append = (level: LogEntry["level"], text: string) =>
    setLog((prev) => [...prev, { ts: Date.now(), level, text }]);

  async function run() {
    setRunning(true);
    setLog([]);
    try {
      const unsignedTx =
        mode === "phantom"
          ? await buildPhantomUnsignedTxBase64()
          : buildMockUnsignedTxBase64();

      const payload: WalletSolanaSignPayload = {
        unsignedTx,
        description: "Smoke test: swap 1 USDC for SOL",
        cluster: "solana:devnet",
        pendingSolanaId: 42,
      };
      append("info", `payload prepared (${unsignedTx.length} chars unsignedTx)`);

      const sign = mode === "phantom" ? phantomSign : mockSign;
      append("info", `calling adapter.signSolanaTransaction (${mode})`);

      const result = await sign(payload);

      append("ok", `signedTx (${result.signedTx.length} chars): ${result.signedTx.slice(0, 64)}…`);

      // Demonstrate what Session.resolve would post — without actually posting
      // (BE not ready). This is the wire shape the host expects.
      const wireEvent = {
        type: "wallet::solana_sign_complete",
        payload: {
          status: "signed",
          signed_tx: result.signedTx,
          description: payload.description,
          pending_solana_id: payload.pendingSolanaId,
        },
      };
      console.log("[smoke] would POST /api/system with body:", wireEvent);
      append("ok", "wire event constructed (see DevTools console)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      append("err", msg);
      console.error("[smoke] failed", err);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 px-8 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Solana sign smoke</h1>
          <p className="text-sm text-stone-400 mt-1">
            Ladder 1: exercises <code>AomiAuthAdapter.signSolanaTransaction</code>{" "}
            without a backend or the SDK queue. Logs what{" "}
            <code>Session.resolve</code> would have posted.
          </p>
        </header>

        <section className="rounded-lg border border-stone-700 p-4 space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("mock")}
              className={`px-3 py-1.5 rounded text-sm border ${
                mode === "mock"
                  ? "bg-stone-200 text-stone-900 border-stone-200"
                  : "border-stone-600 hover:border-stone-400"
              }`}
            >
              mock signer (no Phantom)
            </button>
            <button
              type="button"
              onClick={() => setMode("phantom")}
              disabled={!phantomDetected}
              className={`px-3 py-1.5 rounded text-sm border disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === "phantom"
                  ? "bg-violet-300 text-stone-900 border-violet-300"
                  : "border-stone-600 hover:border-stone-400"
              }`}
            >
              Phantom signer{phantomDetected ? "" : " (not detected)"}
            </button>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={running}
            className="px-4 py-2 rounded bg-emerald-500 text-stone-900 font-semibold disabled:opacity-50"
          >
            {running ? "Signing…" : "Run smoke test"}
          </button>
        </section>

        <section className="rounded-lg border border-stone-700 p-4 min-h-[200px]">
          <h2 className="text-sm uppercase tracking-wide text-stone-400 mb-2">
            Log
          </h2>
          {log.length === 0 ? (
            <p className="text-stone-500 text-sm">
              Click <em>Run smoke test</em> above. Output appears here and in
              DevTools.
            </p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {log.map((entry) => (
                <li
                  key={`${entry.ts}-${entry.text}`}
                  className={
                    entry.level === "err"
                      ? "text-red-400"
                      : entry.level === "ok"
                      ? "text-emerald-300"
                      : "text-stone-300"
                  }
                >
                  {new Date(entry.ts).toLocaleTimeString()}{" "}
                  <span className="opacity-60">[{entry.level}]</span>{" "}
                  {entry.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="text-xs text-stone-500 leading-relaxed">
          <p>
            <strong className="text-stone-400">Next ladders:</strong> when the
            backend is ready, the same adapter swaps into{" "}
            <code>AomiParaProvider</code> and{" "}
            <code>RuntimeTxHandler</code> picks up real{" "}
            <code>wallet::solana_sign_request</code> events from the SDK queue.
            For real signature validation, switch to Phantom mode and decode
            the resulting <code>signedTx</code> with{" "}
            <code>VersionedTransaction.deserialize</code> in DevTools.
          </p>
        </section>
      </div>
    </main>
  );
}
