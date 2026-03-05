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

  // Route /docs to Start Here.
  if (slug.length === 0) {
    redirect("/docs/start-here");
  }

  const slugPath = slug.join("/");

  // Redirect old doc URLs to their new locations.
  const legacyRedirects: Record<string, string> = {
    "about-aomi": "/docs/start-here",
    "architecture": "/docs/reference/architecture",
    "npm-package": "/docs/build-with-aomi/integration/headless/install",
    "shadcn": "/docs/build-with-aomi/integration/widget/install",
    "cli": "/docs/reference/cli",
    "sdk": "/docs/reference/sdk",
    "components": "/docs/build-with-aomi/integration/widget/components",
    "theming": "/docs/build-with-aomi/integration/widget/theming",
    "configuration": "/docs/build-with-aomi/integration/widget/configuration",
    "examples": "/examples/polymarket",
    "runtime": "/docs/reference/runtime",
    "aomi-apps": "/docs/core-concepts/building-apps",
    "script-generation": "/docs/advanced/script-generation",
    "execution": "/docs/advanced/execution",
    "evals": "/docs/advanced/evals",
    "platform-support": "/docs/start-here",
    "getting-started/overview": "/docs/start-here",
    "getting-started/for-businesses": "/docs/build-with-aomi/overview",
    "getting-started/quickstart": "/docs/build-with-aomi/quickstart",
  };

  if (slugPath in legacyRedirects) {
    redirect(legacyRedirects[slugPath]);
  }

  const prefixRedirects = [
    { from: "integration/", to: "build-with-aomi/integration/" },
    { from: "telegram/", to: "use-aomi/telegram/" },
  ] as const;

  for (const { from, to } of prefixRedirects) {
    if (slugPath.startsWith(from)) {
      redirect(`/docs/${to}${slugPath.slice(from.length)}`);
    }
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
