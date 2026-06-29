import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import { getMDXComponents } from "@/app/mdx-components";
import { source } from "@/lib/source";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slug = params.slug ?? [];

  if (slug.length === 0) {
    redirect("/docs/build/overview");
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
