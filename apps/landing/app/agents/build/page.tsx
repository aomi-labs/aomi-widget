import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build an Aomi App",
  description:
    "Turn your platform into an agentic application. Convert any API, SDK, or repo into an Aomi App hosted on our runtime — callable from any Aomi-compatible client.",
  openGraph: {
    title: "Build an Aomi App | Best Blockchain Harness for Agentic AI",
    description:
      "Turn your platform into an agentic application. Convert any API, SDK, or repo into an Aomi App hosted on our runtime — callable from any Aomi-compatible client.",
  },
  twitter: {
    title: "Build an Aomi App | Best Blockchain Harness for Agentic AI",
    description:
      "Turn your platform into an agentic application. Convert any API, SDK, or repo into an Aomi App hosted on our runtime — callable from any Aomi-compatible client.",
  },
  alternates: {
    types: {
      "text/markdown": "https://aomi.dev/agents/build.md",
    },
  },
};

export default function AgentsBuildPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="font-serif text-3xl tracking-tight text-foreground">
        Build
      </p>
      <h1 className="font-geist text-4xl font-semibold tracking-tight">
        Build on Aomi
      </h1>
      <p className="font-geist text-base leading-7 text-muted-foreground">
        Turn your platform into an agentic application. Bring your APIs -
        OpenAPI, REST, SDK - Aomi converts them into intent-shaped tools,
        deployed as an Aomi App hosted on our runtime, with built-in
        scalability and on-chain harness.
      </p>

      <section className="space-y-3">
        <p className="font-geist text-sm leading-6 italic text-muted-foreground">
          Tell your agent
        </p>
        <blockquote className="border-l-2 border-stone-300 pl-4">
          <p className="font-geist text-sm leading-6 text-muted-foreground">
            &quot;Read https://aomi.dev/agents/build.md and build an Aomi app
            for our REST API at api.acme.com, with a ChatGPT-style
            frontend.&quot;
          </p>
        </blockquote>
        <p className="font-geist text-sm">
          <Link className="underline" href="/agents/build.md">
            → aomi.dev/agents/build.md
          </Link>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-geist text-lg font-medium tracking-tight text-foreground">
          Scaffolding
        </h2>

        <div className="space-y-3">
          <p className="font-geist text-sm leading-6 text-foreground">
            Backend in Rust
          </p>
          <div className="rounded-xl border border-white/15 bg-black px-4 py-3">
            <code className="font-geist-mono block text-xs leading-6 text-white">
              $ cargo new my-aomi-app --lib &amp;&amp; cd my-aomi-app
            </code>
            <code className="font-geist-mono block text-xs leading-6 text-white">
              $ cargo add aomi-sdk
            </code>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-geist text-sm leading-6 text-foreground">
            Frontend with ShadCN
          </p>
          <div className="rounded-xl border border-white/15 bg-black px-4 py-3">
            <code className="font-geist-mono block text-xs leading-6 text-white">
              npx shadcn add https://aomi.dev/r/aomi-frame.json
            </code>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-geist text-sm leading-6 text-foreground">
            Or build with our React TypeScript client
          </p>
          <div className="rounded-xl border border-white/15 bg-black px-4 py-3">
            <code className="font-geist-mono block text-xs leading-6 text-white">
              pnpm install @aomi-labs/react
            </code>
          </div>
          <p className="font-geist text-sm leading-6 text-muted-foreground">
            Aomi support headless cli, web ui, telegram, discord, and iOS
            frontend.
          </p>
        </div>
      </section>

      <section className="space-y-3 font-geist text-sm leading-6 text-muted-foreground">
        <p>
          Install skills with <code>npx skills add aomi-labs/skills</code>.
        </p>
        <p>Use the canonical build workflow from the Aomi skills repo.</p>
        <p>Reach for the markdown mirror when you need raw agent-readable text.</p>
      </section>

      <p className="font-geist text-sm">
        <Link className="underline" href="https://aomi.dev/docs/build/overview">
          Open docs/build/overview
        </Link>{" "}
        ·{" "}
        <Link className="underline" href="https://github.com/aomi-labs/skills">
          github.com/aomi-labs/skills
        </Link>
      </p>
    </main>
  );
}
