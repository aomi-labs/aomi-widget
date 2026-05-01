import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aomi for Agents",
  description:
    "Aomi is the blockchain harness for agentic AI. Pick a path: transact on wallets, embed a chat surface, or expose your product as callable AI tools.",
  alternates: {
    types: {
      "text/markdown": "https://aomi.dev/agents.md",
    },
  },
};

export default function AgentsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Aomi for Agents
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          The blockchain harness for agentic AI.
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Use Aomi to transact on wallets, embed a chat surface, or expose your
          product as callable AI tools — non-custodial by design, with
          simulation and local signing built in.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Three guarantees define the harness
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">TRANSACT</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Drive the Aomi CLI for reads, simulations, and signing flows.
          </p>
          <p className="mt-4 text-sm">
            <Link className="underline" href="/agents/transact">
              Open HTML guide
            </Link>{" "}
            ·{" "}
            <Link className="underline" href="/agents/transact.md">
              Raw markdown
            </Link>
          </p>
        </article>
        <article className="rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">EMBED</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add the bundled widget or build a custom UI with the headless React
            library.
          </p>
          <p className="mt-4 text-sm">
            <Link className="underline" href="/docs/build/integration-guide">
              Integration guide
            </Link>
          </p>
        </article>
        <article className="rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">BUILD</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Turn an API, SDK, or repo into an Aomi app with a clean tool
            surface.
          </p>
          <p className="mt-4 text-sm">
            <Link className="underline" href="/agents/build">
              Open HTML guide
            </Link>{" "}
            ·{" "}
            <Link className="underline" href="/agents/build.md">
              Raw markdown
            </Link>
          </p>
        </article>
      </section>
    </main>
  );
}
