import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { solutionBySlug, solutions } from "../../site";
import { solutionPages, type SolutionId } from "../solution-data";
import { SolutionLanding } from "../solution-page";
import { TradingLanding } from "../trading-page";

type Params = { slug: string };

export function generateStaticParams() {
  return solutions.map((item) => ({ slug: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = solutionBySlug[slug as keyof typeof solutionBySlug];
  if (!item) return { title: "Solutions" };
  return {
    title: `${item.title} | Aomi`,
    description: item.job,
    robots: { index: false, follow: false },
  };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const item = solutionBySlug[slug as keyof typeof solutionBySlug];
  if (!item) notFound();
  if (slug === "trading") return <TradingLanding />;
  return <SolutionLanding solution={solutionPages[slug as SolutionId]} />;
}
