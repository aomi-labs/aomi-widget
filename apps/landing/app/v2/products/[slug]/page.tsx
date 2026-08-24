import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products, productBySlug } from "../../site";
import { SkeletonPage } from "../../skeleton-page";

type Params = { slug: string };

export function generateStaticParams() {
  return products.map((item) => ({ slug: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = productBySlug[slug as keyof typeof productBySlug];
  if (!item) return { title: "Products" };
  return {
    title: `${item.title} | Aomi`,
    description: item.job,
    robots: { index: false, follow: false },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const item = productBySlug[slug as keyof typeof productBySlug];
  if (!item) notFound();
  return <SkeletonPage eyebrow="Products" item={item} />;
}
