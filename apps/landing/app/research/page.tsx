import type { Metadata } from "next";
import Link from "next/link";
import { researchPosts } from "@/lib/research";

export const metadata: Metadata = {
  title: "Research | Aomi",
  description:
    "Research notes and benchmarks from Aomi Labs on onchain agents, evaluation, simulation, and agentic execution.",
  openGraph: {
    title: "Research | Aomi",
    description:
      "Research notes and benchmarks from Aomi Labs on onchain agents, evaluation, simulation, and agentic execution.",
  },
  twitter: {
    title: "Research | Aomi",
    description:
      "Research notes and benchmarks from Aomi Labs on onchain agents, evaluation, simulation, and agentic execution.",
  },
};

export default function ResearchPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header>
        <Link
          href="/"
          aria-label="aomi home"
          className="font-pt-serif flex items-center justify-end gap-2 pr-5 text-xl font-bold tracking-tight text-foreground"
        >
          <img
            src="/assets/images/bubble.svg"
            alt=""
            className="h-5 w-5 dark:invert"
          />
          <span>aomi</span>
        </Link>
        <h1 className="mt-8 font-serif text-4xl tracking-tight text-foreground md:text-5xl">
          Research
        </h1>
        <div className="mt-8 h-px w-full bg-stone-200" />
      </header>

      <section className="space-y-5">
        {researchPosts.map((post, index) => (
          <Link
            key={post.slug}
            href={`/research/${post.slug}`}
            className="group grid min-h-[150px] overflow-hidden rounded-[24px] border border-stone-200 bg-white text-stone-950 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md md:grid-cols-[minmax(180px,34%)_1fr]"
          >
            <div
              aria-hidden="true"
              className={[
                "min-h-[120px] border-b border-stone-200 md:min-h-full md:border-r md:border-b-0",
                index % 2 === 0
                  ? "bg-[radial-gradient(circle_at_82%_62%,rgba(255,214,122,0.82)_0%,rgba(255,126,143,0.84)_18%,transparent_34%),linear-gradient(180deg,#75aeca_0%,#b9b8ae_42%,#ff7f8f_72%,#a887a2_100%)]"
                  : "bg-[radial-gradient(circle_at_18%_68%,rgba(255,214,122,0.82)_0%,rgba(255,126,143,0.84)_18%,transparent_34%),linear-gradient(180deg,#75aeca_0%,#b9b8ae_42%,#ff7f8f_72%,#a887a2_100%)]",
              ].join(" ")}
            >
              <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />
            </div>

            <div className="flex flex-col justify-center gap-4 px-5 py-5 sm:px-7 lg:px-8">
              <div className="space-y-3">
                <span className="font-geist-mono inline-flex w-fit rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium tracking-[0.1em] text-stone-600">
                  {post.tag}
                </span>
                <h2 className="max-w-3xl font-serif text-xl leading-tight font-normal tracking-tight text-stone-950 md:text-2xl">
                  {post.title}
                </h2>
                <p className="font-geist max-w-2xl text-sm leading-6 text-stone-500">
                  {post.subtitle}
                </p>
              </div>
              <time
                className="font-geist-mono text-xs text-stone-500"
                dateTime={post.isoDate}
              >
                {post.date}
              </time>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
