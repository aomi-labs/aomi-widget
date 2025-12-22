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
    description: "Install the package, import styles, and run the docs locally.",
    section: "Start here",
    Component: GettingStarted,
  },
  {
    slug: "providers",
    title: "Providers & runtime",
    description: "Thread context, runtime provider, and mock data strategy.",
    section: "Guides",
    Component: Providers,
  },
  {
    slug: "theming",
    title: "Theming",
    description: "Override CSS variables and share tokens with the docs app.",
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
