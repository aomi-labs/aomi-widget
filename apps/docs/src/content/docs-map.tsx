import type { ComponentType } from "react";

import GettingStarted from "../../content/getting-started.mdx";
import Providers from "../../content/providers.mdx";
import Theming from "../../content/theming.mdx";

export type DocEntry = {
  slug: string;
  title: string;
  description: string;
  section: string;
  Component: ComponentType;
};

export const docsEntries: DocEntry[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Install, import styles, and drop AomiFrame into your app.",
    section: "Start here",
    Component: GettingStarted,
  },
  {
    slug: "providers",
    title: "Providers & runtime",
    description: "Thread context, runtime adapter, and backend contract.",
    section: "Guides",
    Component: Providers,
  },
  {
    slug: "theming",
    title: "Theming",
    description: "Override CSS variables, fonts, radii, and sidebar tokens.",
    section: "Guides",
    Component: Theming,
  },
];

export type DocSection = {
  title: string;
  items: DocEntry[];
};

export const docSections: DocSection[] = [
  {
    title: "Start here",
    items: docsEntries.filter((doc) => doc.section === "Start here"),
  },
  {
    title: "Guides",
    items: docsEntries.filter((doc) => doc.section === "Guides"),
  },
];

export function getDocBySlug(slug: string) {
  return docsEntries.find((doc) => doc.slug === slug);
}

export const defaultDocSlug = docsEntries[0]?.slug ?? "getting-started";
