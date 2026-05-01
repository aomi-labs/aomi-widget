import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transact with Aomi",
  description:
    "Drive the Aomi CLI to read prices, simulate transactions, and sign locally — the wallet-acting half of the blockchain harness for agentic AI.",
  alternates: {
    types: {
      "text/markdown": "https://aomi.dev/agents/transact.md",
    },
  },
};

export default function AgentsTransactPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
        TRANSACT
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Read, simulate, and sign with Aomi.
      </h1>
      <p className="text-base leading-7 text-muted-foreground">
        The wallet-acting half of the blockchain harness for agentic AI. Drive
        the Aomi CLI for reads, transaction preparation, simulation, and
        signing flows — non-custodial, with private keys never round-tripping
        through the agent.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        <li>
          Install the CLI with <code>npm install -g @aomi-labs/client</code>.
        </li>
        <li>
          <strong className="text-foreground">Read by default.</strong> Chat,
          prices, balances, and simulations require no signing key.
        </li>
        <li>
          <strong className="text-foreground">Simulate before sign.</strong>{" "}
          Every transaction is dry-run on a forked chain before it can be
          signed.
        </li>
        <li>
          <strong className="text-foreground">
            Credentials never round-trip.
          </strong>{" "}
          Private keys stay on the user&apos;s machine; the agent never sees
          them.
        </li>
      </ul>
      <p className="text-sm">
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
