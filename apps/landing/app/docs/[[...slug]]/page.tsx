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

  // Route /docs to the Build overview.
  if (slug.length === 0) {
    redirect("/docs/build/overview");
  }

  const slugPath = slug.join("/");

  // Redirect old doc URLs to their new locations.
  const legacyRedirects: Record<string, string> = {
    // Old legacy redirects → updated targets
    "about-aomi": "/docs/build/overview",
    "architecture": "/docs/reference/architecture",
    "npm-package": "/docs/build/headless/install",
    "shadcn": "/docs/build/quickstart",
    "cli": "/docs/reference/cli",
    "sdk": "/docs/reference/sdk",
    "components": "/docs/build/widget/components",
    "theming": "/docs/build/widget/theming",
    "configuration": "/docs/build/widget/configuration",
    "examples": "/examples/polymarket",
    "runtime": "/docs/reference/runtime",
    "aomi-apps": "/docs/build/building-apps",
    "script-generation": "/docs/advanced/script-generation",
    "execution": "/docs/advanced/execution",
    "evals": "/docs/advanced/evals",
    "platform-support": "/docs/build/overview",

    // New redirects for restructured paths
    "getting-started/overview": "/docs/build/overview",
    "getting-started/for-businesses": "/docs/build/how-it-works",
    "getting-started/quickstart": "/docs/build/quickstart",
    "core-concepts/how-it-works": "/docs/build/how-it-works",
    "core-concepts/namespaces": "/docs/build/namespaces",
    "core-concepts/api-reference": "/docs/build/api-reference",
    "core-concepts/sessions": "/docs/build/sessions",
    "core-concepts/building-apps": "/docs/build/building-apps",
    "integration/overview": "/docs/build/overview",
    "integration/widget/install": "/docs/build/quickstart",
    "integration/widget/aomi-frame": "/docs/build/widget/aomi-frame",
    "integration/widget/components": "/docs/build/widget/components",
    "integration/widget/theming": "/docs/build/widget/theming",
    "integration/widget/configuration": "/docs/build/widget/configuration",
    "integration/headless/install": "/docs/build/headless/install",
    "integration/headless/runtime-provider": "/docs/build/headless/runtime-provider",
    "integration/headless/hooks": "/docs/build/headless/hooks",
    "integration/headless/build-custom-ui": "/docs/build/headless/build-custom-ui",
    "integration/wallet-integration": "/docs/build/wallet-integration",
    "telegram/overview": "/docs/use-aomi/telegram/overview",
    "telegram/commands": "/docs/use-aomi/telegram/commands",
    "telegram/panels": "/docs/use-aomi/telegram/panels",
    "telegram/wallet": "/docs/use-aomi/telegram/wallet",
    "telegram/admin": "/docs/build/telegram-bot",
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
