import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { V3DetailPage } from "../../detail-page";
import { productBySlug, products } from "../../site";

export function generateStaticParams() {
  return products.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = productBySlug[slug];
  return page
    ? {
        title: `${page.title} | Aomi V3`,
        description: page.summary,
        robots: { index: false, follow: false },
      }
    : { title: "Product not found" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = productBySlug[slug];
  if (!page) notFound();
  return <V3DetailPage page={page} kind="product" />;
}
