import type { Metadata } from "next";
import { resourceBySlug } from "../site";
import { SkeletonPage } from "../skeleton-page";

const item = resourceBySlug.contact;

export const metadata: Metadata = {
  title: `${item.title} | Aomi`,
  description: item.job,
  robots: { index: false, follow: false },
};

export default function ContactPage() {
  return <SkeletonPage eyebrow="Resource" item={item} />;
}
