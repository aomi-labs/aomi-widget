import Link from "next/link";
import Image from "next/image";

import { blogs } from "@/components/content";

const formatDate = (isoDate?: string) => {
  if (!isoDate) return null;

  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.warn("Invalid blog date", isoDate, error);
    return null;
  }
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 pb-24 pt-24 md:px-10">
        <header className="flex flex-col gap-4 text-left">
          <span className="text-xs uppercase tracking-[0.35em] text-gray-500 font-bauhaus">
            Journal
          </span>
          <h1 className="text-4xl font-semibold font-pixelify text-gray-900">
            Field notes from the Aomi stack
          </h1>
          <p className="max-w-2xl text-sm font-light font-bauhaus text-gray-700 text-justify">
            Deep dives on agentic software, intent pipelines, and the infrastructure we build to keep
            autonomous systems safe on public blockchains.
          </p>
        </header>

        <div className="flex flex-col gap-12">
          {blogs.map((blog) => {
            const publishedLabel = formatDate(blog.publishedAt);

            return (
              <article
                key={blog.slug}
                className="group grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-gray-300 hover:shadow-md md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 md:p-8"
              >
                <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                  <Image
                    src={blog.imageSrc}
                    alt={blog.imageAlt}
                    width={800}
                    height={600}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    sizes="(min-width: 768px) 480px, 100vw"
                    priority={false}
                  />
                </div>

                <div className="flex flex-col justify-between gap-6">
                  <div className="flex flex-col gap-3 text-left md:text-left">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-gray-500 font-bauhaus">
                      <span>{blog.eyebrow || "Dispatch"}</span>
                      {publishedLabel && (
                        <span className="text-[11px] tracking-[0.25em] text-gray-400">
                          {publishedLabel}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 font-pixelify">
                      <Link href={`/blog/${blog.slug}`} className="transition hover:text-gray-600">
                        {blog.title}
                      </Link>
                    </h2>
                    <p className="text-sm font-light leading-relaxed text-gray-700 text-justify font-bauhaus">
                      {blog.description}
                    </p>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
