import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transact with Aomi",
  description:
    "Execute on-chain transactions through the Aomi CLI — swap, send, stake, bridge across any on-chain protocol or off-chain API. The Aomi runtime resolves intents and simulates every transaction on a multi-chain fork before signing, so malformed calldata never reaches the user's wallet. The execution layer of the blockchain harness for agentic AI.",
  openGraph: {
    title: "Transact with Aomi | Best Blockchain Harness for Agentic AI",
    description:
      "Execute on-chain operations through the Aomi CLI — swap, send, stake, bridge across any protocol or API. The Aomi runtime simulates every transaction on a multi-chain fork before signing, so malformed calldata never reaches the user's wallet.",
  },
  twitter: {
    title: "Transact with Aomi | Best Blockchain Harness for Agentic AI",
    description:
      "Execute on-chain operations through the Aomi CLI — swap, send, stake, bridge across any protocol or API. The Aomi runtime simulates every transaction on a multi-chain fork before signing, so malformed calldata never reaches the user's wallet.",
  },
  alternates: {
    types: {
      "text/markdown": "https://aomi.dev/agents/transact.md",
    },
  },
};

export default function AgentsTransactPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="font-serif text-3xl tracking-tight text-foreground">
        Transact
      </p>
      <h1 className="font-geist text-4xl font-semibold tracking-tight">
        Execute on-chain operations through the Aomi CLI.
      </h1>
      <p className="font-geist text-base leading-7 text-muted-foreground">
        Swap, send, stake, lend, and bridge across any on-chain protocol or
        off-chain API on Ethereum, Base, Arbitrum, Polygon, Optimism, and
        Sepolia. The Aomi runtime resolves the intent, builds the transactions,
        and simulates them on a multi-chain fork before signing — malformed
        calldata, failed approvals, and unexpected reverts are caught before
        they ever reach the user&apos;s wallet. You sign locally; the bundle
        settles atomically via account abstraction — the execution layer of
        the blockchain harness for agentic AI.
      </p>
      <div className="space-y-3 font-geist text-sm leading-6 text-muted-foreground">
        <p>
          Install the CLI with <code>npm install -g @aomi-labs/client</code>.
        </p>
        <p>
          <strong className="text-foreground">Read by default.</strong> Chat,
          prices, balances, and simulations require no signing key.
        </p>
        <p>
          <strong className="text-foreground">Simulate before sign.</strong>{" "}
          Every transaction is dry-run on a forked chain before it can be
          signed.
        </p>
        <p>
          <strong className="text-foreground">
            Credentials never round-trip.
          </strong>{" "}
          Private keys stay on the user&apos;s machine; the agent never sees
          them.
        </p>
      </div>
      <p className="font-geist text-sm">
        <Link className="underline" href="/agents/transact.md">
          Open /agents/transact.md
        </Link>{" "}
        ·{" "}
        <Link className="underline" href="https://github.com/aomi-labs/skills">
          github.com/aomi-labs/skills
        </Link>
      </p>
    </main>
  );
}
