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
    "npm-package": "/docs/build/ui/headless/install",
    "shadcn": "/docs/build/quickstart",
    "cli": "/docs/reference/cli",
    "sdk": "/docs/reference/sdk",
    "components": "/docs/build/ui/widget/components",
    "theming": "/docs/build/ui/widget/theming",
    "configuration": "/docs/build/ui/widget/configuration",
    "examples": "/examples/polymarket",
    "runtime": "/docs/reference/runtime",
    "aomi-apps": "/docs/build/services/building-apps",
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
    "core-concepts/api-reference": "/docs/build/services/api-reference",
    "core-concepts/sessions": "/docs/build/services/sessions",
    "core-concepts/building-apps": "/docs/build/services/building-apps",
    "integration/overview": "/docs/build/overview",
    "integration/widget/install": "/docs/build/quickstart",
    "integration/widget/aomi-frame": "/docs/build/ui/widget/aomi-frame",
    "integration/widget/components": "/docs/build/ui/widget/components",
    "integration/widget/theming": "/docs/build/ui/widget/theming",
    "integration/widget/configuration": "/docs/build/ui/widget/configuration",
    "integration/headless/install": "/docs/build/ui/headless/install",
    "integration/headless/runtime-provider": "/docs/build/ui/headless/runtime-provider",
    "integration/headless/hooks": "/docs/build/ui/headless/hooks",
    "integration/headless/build-custom-ui": "/docs/build/ui/headless/build-custom-ui",
    "integration/wallet-integration": "/docs/build/services/wallet-integration",
    "telegram/overview": "/docs/use-aomi/telegram/overview",
    "telegram/commands": "/docs/use-aomi/telegram/commands",
    "telegram/panels": "/docs/use-aomi/telegram/panels",
    "telegram/wallet": "/docs/use-aomi/telegram/wallet",
    "telegram/admin": "/docs/build/services/telegram-bot",

    // Redirect old canonical Build docs paths to the new folder structure
    "build/widget/aomi-frame": "/docs/build/ui/widget/aomi-frame",
    "build/widget/components": "/docs/build/ui/widget/components",
    "build/widget/theming": "/docs/build/ui/widget/theming",
    "build/widget/configuration": "/docs/build/ui/widget/configuration",
    "build/headless/install": "/docs/build/ui/headless/install",
    "build/headless/runtime-provider": "/docs/build/ui/headless/runtime-provider",
    "build/headless/hooks": "/docs/build/ui/headless/hooks",
    "build/headless/build-custom-ui": "/docs/build/ui/headless/build-custom-ui",
    "build/sessions": "/docs/build/services/sessions",
    "build/building-apps": "/docs/build/services/building-apps",
    "build/api-reference": "/docs/build/services/api-reference",
    "build/wallet-integration": "/docs/build/services/wallet-integration",
    "build/telegram-bot": "/docs/build/services/telegram-bot",
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
