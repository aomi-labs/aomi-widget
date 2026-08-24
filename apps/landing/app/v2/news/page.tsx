import type { Metadata } from "next";
import { resourceBySlug } from "../site";
import { SkeletonPage } from "../skeleton-page";

const item = resourceBySlug.news;

export const metadata: Metadata = {
  title: `${item.title} | Aomi`,
  description: item.job,
  robots: { index: false, follow: false },
};

export default function NewsPage() {
  return <SkeletonPage eyebrow="Resource" item={item} />;
}
