import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { docSections, docsEntries, getDocBySlug } from "@docs/content/docs-map";

type DocPageParams = {
  slug: string;
};

export function generateStaticParams() {
  return docsEntries.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<DocPageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);
  return {
    title: doc ? `${doc.title} · Aomi Widget Docs` : "Docs · Aomi Widget",
    description: doc?.description ?? "Docs and playground for @aomi-labs/widget-lib.",
  };
}

export default async function DocPage({ params }: { params: Promise<DocPageParams> }) {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);
  if (!doc) {
    return notFound();
  }
  const PageContent = doc.Component;
  const sectionTitle = docSections.find((section) => section.items.some((item) => item.slug === doc.slug))?.title;

  return (
    <article className="docs-prose space-y-6 rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur">
      <div className="space-y-1">
        {sectionTitle ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{sectionTitle}</p> : null}
        <h1 className="text-3xl font-semibold leading-tight">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">{doc.description}</p>
      </div>
      <div className="space-y-5">
        <PageContent />
      </div>
    </article>
  );
}
