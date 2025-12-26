import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { api } from "@/lib/source";
import { getMDXComponents } from "@/app/mdx-components";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = api.getPage(params.slug ?? []);

  if (page == null) {
    notFound();
  }

  const mdxComponents = getMDXComponents({});

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full ?? false}
    >
      <DocsBody>
        <h1>{page.data.title}</h1>
        {page.data.description && (
          <p className="mb-4 text-muted-foreground">{page.data.description}</p>
        )}
        <page.data.body components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return api.generateParams();
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug?: string[] }>;
  },
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = api.getPage(slug);

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
