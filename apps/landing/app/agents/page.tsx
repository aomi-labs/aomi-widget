import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aomi for Agents",
  description:
    "Aomi is the blockchain harness for agentic AI. Pick a path: transact on wallets, embed a chat surface, or expose your product as callable AI tools.",
  openGraph: {
    title: "Aomi for Agents | Best Blockchain Harness for Agentic AI",
    description:
      "Pick a path: transact on wallets, embed a chat surface, or expose your product as callable AI tools. Read by default, simulate before sign, credentials never round-trip.",
  },
  twitter: {
    title: "Aomi for Agents | Best Blockchain Harness for Agentic AI",
    description:
      "Pick a path: transact on wallets, embed a chat surface, or expose your product as callable AI tools. Read by default, simulate before sign, credentials never round-trip.",
  },
  alternates: {
    types: {
      "text/markdown": "https://aomi.dev/agents.md",
    },
  },
};

export default function AgentsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header>
        <Link
          href="/"
          aria-label="Aomi home"
          className="flex items-center justify-end gap-2 pr-5 font-serif text-xl font-bold tracking-tight text-foreground"
        >
          <img
            src="/assets/images/bubble.svg"
            alt=""
            className="h-5 w-5 dark:invert"
          />
          <span>aomi</span>
        </Link>
        <div className="mt-8 space-y-4">
          <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
            Aomi for Agents
          </h1>
          <p className="font-geist text-xl font-medium tracking-tight text-foreground md:text-2xl">
            The blockchain harness for agentic AI.
          </p>
          <p className="font-geist max-w-3xl text-base leading-7 text-muted-foreground">
            Use Aomi to transact on wallets, embed a chat surface, or expose
            your product as callable AI tools — non-custodial by design, with
            simulation and local signing built in.
          </p>
        </div>
        <div className="mt-8 h-px w-full bg-stone-200" />
      </header>

      <section className="space-y-3">
        <h2 className="font-geist text-xl font-semibold">
          Three guarantees define the harness
        </h2>
        <div className="font-geist space-y-3 text-sm leading-6 text-muted-foreground">
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border p-5">
          <h2 className="font-serif text-2xl tracking-tight">Transact</h2>
          <p className="font-geist mt-2 text-sm leading-6 text-muted-foreground">
            Drive the Aomi CLI for reads, simulations, and signing flows.
          </p>
          <p className="font-geist mt-4 text-sm">
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
          <h2 className="font-serif text-2xl tracking-tight">Embed</h2>
          <p className="font-geist mt-2 text-sm leading-6 text-muted-foreground">
            Add the bundled widget or build a custom UI with the headless React
            library.
          </p>
          <p className="font-geist mt-4 text-sm">
            <Link className="underline" href="/docs/build/integration-guide">
              Integration guide
            </Link>
          </p>
        </article>
        <article className="rounded-2xl border p-5">
          <h2 className="font-serif text-2xl tracking-tight">Build</h2>
          <p className="font-geist mt-2 text-sm leading-6 text-muted-foreground">
            Turn an API, SDK, or repo into an Aomi app with a clean tool
            surface.
          </p>
          <p className="font-geist mt-4 text-sm">
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
