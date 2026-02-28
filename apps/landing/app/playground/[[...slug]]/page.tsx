import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { playground } from "@/lib/source";
import { getMDXComponents } from "@/app/mdx-components";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const slug = params.slug ?? [];

  if (slug.length === 0) {
    redirect("/playground/configurator");
  }

  const page = playground.getPage(slug);

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
  return playground.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = playground.getPage(slug);

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
