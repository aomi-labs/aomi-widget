import Link from "next/link";
import { ArrowLeft, Github } from "lucide-react";

import { SidebarNav } from "@docs/components/layout/SidebarNav";
import { docSections } from "@docs/content/docs-map";

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug?: string }>;
}) {
  const resolvedParams = await params;
  const currentSlug = Array.isArray(resolvedParams.slug) ? resolvedParams.slug[0] : resolvedParams.slug;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60 bg-card/70/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to overview
            </Link>
            <span className="hidden h-5 w-px bg-border/80 sm:block" aria-hidden />
            <div className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
              Docs
            </div>
          </div>
          <Link
            href="https://github.com/aomi-labs"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-border/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <Github className="size-4" />
            GitHub
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">
        <aside className="hidden w-72 shrink-0 lg:block">
          <SidebarNav sections={docSections} currentSlug={currentSlug} />
        </aside>
        <div className="flex-1 space-y-6">
          <div className="block rounded-2xl border border-border/60 bg-card/70 p-4 shadow-lg backdrop-blur lg:hidden">
            <SidebarNav sections={docSections} currentSlug={currentSlug} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
