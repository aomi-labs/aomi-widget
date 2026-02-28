import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/app/mdx-components";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slug = params.slug ?? [];

  // Route /docs to the Getting Started overview.
  if (slug.length === 0) {
    redirect("/docs/getting-started/overview");
  }

  // Redirect old doc URLs to their new locations.
  const legacyRedirects: Record<string, string> = {
    "about-aomi": "/docs/getting-started/overview",
    "architecture": "/docs/reference/architecture",
    "npm-package": "/docs/integration/headless/install",
    "shadcn": "/docs/integration/widget/install",
    "cli": "/docs/reference/cli",
    "sdk": "/docs/reference/sdk",
    "components": "/docs/integration/widget/components",
    "theming": "/docs/integration/widget/theming",
    "configuration": "/docs/integration/widget/configuration",
    "examples": "/examples/mycoindex",
    "runtime": "/docs/reference/runtime",
    "aomi-apps": "/docs/core-concepts/building-apps",
    "script-generation": "/docs/advanced/script-generation",
    "execution": "/docs/advanced/execution",
    "evals": "/docs/advanced/evals",
    "platform-support": "/docs/getting-started/overview",
  };

  const slugPath = slug.join("/");
  if (slugPath in legacyRedirects) {
    redirect(legacyRedirects[slugPath]);
  }

  const page = source.getPage(slug);

  if (page == null) {
    notFound();
  }

  const mdxComponents = getMDXComponents({});

  return (
    <DocsPage toc={page.data.toc} full={page.data.full ?? false}>
      <DocsBody>
        <page.data.body components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug);

  if (!page) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: page.data.title,
    description: page.data.description ?? null,
  };
}
