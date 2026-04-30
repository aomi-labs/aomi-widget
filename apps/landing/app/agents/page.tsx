import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aomi for Agents",
  description:
    "Agent-facing Aomi entry point for transaction execution, UI embedding, and app-building workflows.",
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
          Turn your platform into an agentic application.
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Use Aomi to transact on wallets, embed a chat surface, or expose your
          product as callable AI tools.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Safety mantra</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Read by default.</li>
          <li>Simulate before sign.</li>
          <li>Credentials never round-trip.</li>
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
