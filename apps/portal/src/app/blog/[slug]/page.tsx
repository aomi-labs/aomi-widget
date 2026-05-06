import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { blogs } from "@/components/content";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

const getBlog = (slug: string) => blogs.find((entry) => entry.slug === slug);

const formatDate = (isoDate?: string) => {
  if (!isoDate) return null;

  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.warn("Invalid blog date", isoDate, error);
    return null;
  }
};

export function generateStaticParams() {
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = getBlog(slug);

  if (!blog) {
    return {
      title: "Blog post not found",
    };
  }

  return {
    title: `${blog.title} · Aomi Labs`,
    description: blog.description,
    openGraph: {
      title: blog.title,
      description: blog.description,
      images: blog.imageSrc ? [{ url: blog.imageSrc }] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogPageProps) {
  const { slug } = await params;
  const blog = getBlog(slug);

  if (!blog) {
    notFound();
  }

  const publishedLabel = formatDate(blog.publishedAt);
  const bodyParagraphs = blog.body ? blog.body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean) : [];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 pb-32 pt-24 md:px-10">
        <div className="flex flex-col gap-4 text-left">
          <Link href="/blog" className="text-xs uppercase tracking-[0.35em] text-gray-400 font-bauhaus">
            ← Back to blog
          </Link>
          <span className="text-xs uppercase tracking-[0.35em] text-gray-500 font-bauhaus">
            {blog.eyebrow || "Dispatch"}
          </span>
          <h1 className="text-4xl font-semibold text-gray-900 font-pixelify">
            {blog.title}
          </h1>
          {publishedLabel && (
            <time dateTime={blog.publishedAt} className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bauhaus">
              {publishedLabel}
            </time>
          )}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-50">
          <Image
            src={blog.imageSrc}
            alt={blog.imageAlt}
            width={1280}
            height={720}
            className="h-full w-full object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6 text-sm font-light leading-relaxed text-gray-800 text-justify font-bauhaus">
          <p>{blog.description}</p>
          {bodyParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>

        {blog.cta?.href && (
          <div className="flex flex-wrap gap-4">
            <a
              href={blog.cta.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400 font-bauhaus"
            >
              View external version ↗
            </a>
          </div>
        )}
      </article>
    </main>
  );
}
