import type { Metadata } from "next";
import Link from "next/link";
import { researchPosts } from "@/lib/research";
import { resourceBySlug } from "../site";
import { SkeletonPage } from "../skeleton-page";
import styles from "../v2.module.css";

const item = resourceBySlug.research;

export const metadata: Metadata = {
  title: `${item.title} | Aomi`,
  description: item.job,
  robots: { index: false, follow: false },
};

export default function ResearchIndexPage() {
  return (
    <SkeletonPage eyebrow="Resource" item={item}>
      <ul className="mt-10 max-w-[40rem] space-y-4">
        {researchPosts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/research/${post.slug}`}
              className={`${styles.cardTitleSm} text-[color:var(--v2-heading)] underline-offset-4 hover:underline`}
            >
              {post.title}
            </Link>
            <p className={`${styles.bodySm} mt-1 text-[color:var(--v2-fg-subtle)]`}>
              {post.tag} · {post.date}
            </p>
          </li>
        ))}
        <li>
          <Link
            href="/research"
            className={`${styles.bodySm} text-[color:var(--v2-heading)] underline underline-offset-4`}
          >
            Full research index
          </Link>
        </li>
      </ul>
    </SkeletonPage>
  );
}
