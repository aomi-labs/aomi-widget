import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transact with Aomi",
  description: "Agent-facing HTML entry point for transaction execution with Aomi.",
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
        Use Aomi for wallet-aware reads, transaction preparation, simulation,
        and signing flows without custodial key handling.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        <li>Install the CLI with <code>npm install -g @aomi-labs/client</code>.</li>
        <li>Read by default.</li>
        <li>Simulate before sign.</li>
        <li>Credentials never round-trip.</li>
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
