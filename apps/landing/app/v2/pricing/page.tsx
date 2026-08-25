import type { Metadata } from "next";
import { pricing } from "../site";
import { SkeletonPage } from "../skeleton-page";

export const metadata: Metadata = {
  title: `${pricing.title} | Aomi`,
  description: pricing.job,
  robots: { index: false, follow: false },
};

export default function PricingPage() {
  return <SkeletonPage eyebrow="Pricing" item={pricing} />;
}
