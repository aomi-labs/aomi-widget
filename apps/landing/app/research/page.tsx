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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-8 py-12 sm:px-12 lg:px-16">
      <header className="space-y-4">
        <div className="font-geist flex items-center justify-end gap-2 pr-5 text-lg font-normal tracking-tight text-foreground">
          <img
            src="/assets/images/bubble.svg"
            alt=""
            className="h-5 w-5 dark:invert"
          />
          <span>aomi labs</span>
        </div>
        <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
          Research
        </h1>
        <div className="h-px w-full bg-stone-200" />
      </header>

      <section className="space-y-5">
        {researchPosts.map((post, index) => (
          <Link
            key={post.slug}
            href={`/research/${post.slug}`}
            className="group grid min-h-[240px] overflow-hidden rounded-[28px] border border-stone-200 bg-white text-stone-950 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md md:grid-cols-[minmax(260px,34%)_1fr]"
          >
            <div
              aria-hidden="true"
              className={[
                "min-h-[150px] border-b border-stone-200 md:min-h-full md:border-r md:border-b-0",
                index % 2 === 0
                  ? "bg-[radial-gradient(circle_at_82%_62%,rgba(255,214,122,0.82)_0%,rgba(255,126,143,0.84)_18%,transparent_34%),linear-gradient(180deg,#75aeca_0%,#b9b8ae_42%,#ff7f8f_72%,#a887a2_100%)]"
                  : "bg-[radial-gradient(circle_at_18%_68%,rgba(255,214,122,0.82)_0%,rgba(255,126,143,0.84)_18%,transparent_34%),linear-gradient(180deg,#75aeca_0%,#b9b8ae_42%,#ff7f8f_72%,#a887a2_100%)]",
              ].join(" ")}
            >
              <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />
            </div>

            <div className="flex flex-col justify-center gap-8 px-6 py-8 sm:px-10 lg:px-12">
              <div className="space-y-5">
                <span className="font-geist-mono inline-flex w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-medium tracking-[0.12em] text-stone-600">
                  {post.tag}
                </span>
                <h2 className="max-w-4xl font-serif text-2xl leading-tight font-normal tracking-tight text-stone-950 md:text-4xl">
                  {post.title}
                </h2>
                <p className="font-geist max-w-3xl text-base leading-7 text-stone-500">
                  {post.subtitle}
                </p>
              </div>
              <time
                className="font-geist-mono text-sm text-stone-500"
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
