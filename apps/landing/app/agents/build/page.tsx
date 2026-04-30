import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build an Aomi App",
  description: "Agent-facing HTML entry point for building Aomi apps.",
  alternates: {
    types: {
      "text/markdown": "https://aomi.dev/agents/build.md",
    },
  },
};

export default function AgentsBuildPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
        BUILD
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Build an Aomi app from an API, SDK, or repo.
      </h1>
      <p className="text-base leading-7 text-muted-foreground">
        This HTML surface exists so agent crawlers and humans have a stable
        entry point. The complete instruction set lives in the markdown guide.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        <li>Install skills with <code>npx skills add aomi-labs/skills</code>.</li>
        <li>Use the canonical build workflow from the Aomi skills repo.</li>
        <li>Reach for the markdown mirror when you need raw agent-readable text.</li>
      </ul>
      <p className="text-sm">
        <Link className="underline" href="/agents/build.md">
          Open /agents/build.md
        </Link>{" "}
        ·{" "}
        <Link className="underline" href="https://github.com/aomi-labs/skills">
          github.com/aomi-labs/skills
        </Link>
      </p>
    </main>
  );
}
