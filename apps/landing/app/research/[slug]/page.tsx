import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getResearchPost,
  readResearchPost,
  researchPosts,
} from "@/lib/research";

function textFromChildren(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return textFromChildren(child.props.children);
      }

      return "";
    })
    .join("");
}

function isImageOnly(children: ReactNode) {
  const childArray = Children.toArray(children);
  const child = childArray[0];

  return (
    childArray.length === 1 &&
    isValidElement<{ src?: string; alt?: string }>(child) &&
    typeof child.props.src === "string"
  );
}

function imageSrc(src: unknown) {
  if (typeof src !== "string") {
    return "";
  }

  if (src.startsWith("figures/")) {
    return `/research/aomibench-v0.1/${src}`;
  }

  return src;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-serif text-4xl leading-tight font-normal tracking-tight text-foreground md:text-5xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-14 font-serif text-3xl leading-tight font-normal tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-geist mt-9 text-xl font-normal tracking-tight text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => {
    if (isImageOnly(children)) {
      return <figure className="my-9">{children}</figure>;
    }

    const text = textFromChildren(children).trim();

    if (/^(Figure|Table|Code)\s+\d+/.test(text)) {
      return (
        <p className="font-geist-mono my-3 text-sm leading-6 text-stone-500 dark:text-stone-300">
          {children}
        </p>
      );
    }

    return (
      <p className="font-geist text-[17px] leading-8 text-stone-700 dark:text-white">
        {children}
      </p>
    );
  },
  a: ({ children, href }) => (
    <a className="text-[#1D9E75] underline underline-offset-2" href={href}>
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img
      src={imageSrc(src)}
      alt={alt ?? ""}
      className="mx-auto h-auto w-full rounded-xl border border-stone-200 bg-white dark:border-stone-700"
    />
  ),
  ul: ({ children }) => (
    <ul className="font-geist my-5 list-disc space-y-2 pl-6 text-[17px] leading-8 text-stone-700 dark:text-white">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="font-geist my-5 list-decimal space-y-2 pl-6 text-[17px] leading-8 text-stone-700 dark:text-white">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => {
    const text = textFromChildren(children).trim();

    if (/^Figure\s+\d+/.test(text)) {
      return (
        <figure className="my-9 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-6 dark:border-stone-700 dark:bg-stone-900">
          <div className="font-geist-mono text-sm leading-6 text-stone-500 dark:text-stone-300">
            {children}
          </div>
        </figure>
      );
    }

    return (
      <blockquote className="my-8 border-l-2 border-stone-300 pl-5 text-stone-600 dark:border-stone-700 dark:text-white">
        {children}
      </blockquote>
    );
  },
  code: ({ children, className }) => {
    const isBlock = className !== undefined;

    if (isBlock) {
      return (
        <code className={`${className} font-geist-mono text-sm`}>
          {children}
        </code>
      );
    }

    return (
      <code className="font-geist-mono rounded bg-stone-100 px-1.5 py-0.5 text-sm text-stone-800 dark:bg-stone-800 dark:text-white">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-7 overflow-x-auto rounded-xl border border-stone-200 bg-[#f6f7f9] p-5 text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-white">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
      <table className="font-geist w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-stone-200 bg-stone-50 px-4 py-3 text-left font-medium text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-white">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-stone-100 px-4 py-3 text-stone-700 dark:border-stone-800 dark:text-white">
      {children}
    </td>
  ),
};

export function generateStaticParams() {
  return researchPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getResearchPost(slug);

  if (post === null) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: `${post.title} | Aomi Research`,
    description:
      "Aomi research on benchmarked onchain execution for frontier agents.",
  };
}

export default async function ResearchPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await readResearchPost(slug);

  if (post === null) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-8 py-12 text-foreground sm:px-12 lg:px-16">
      <div className="font-geist-mono mb-10 flex flex-wrap items-center gap-3 text-xs tracking-[0.14em] text-muted-foreground">
        <Link
          className="text-stone-600 hover:text-foreground dark:text-white"
          href="/research"
        >
          Research
        </Link>
        <span>/</span>
        <span>{post.tag}</span>
        <span>/</span>
        <time dateTime={post.isoDate}>{post.date}</time>
      </div>

      <article className="space-y-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {post.body}
        </ReactMarkdown>
      </article>
    </main>
  );
}
