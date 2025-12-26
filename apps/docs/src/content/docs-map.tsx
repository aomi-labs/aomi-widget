import type { ComponentType } from "react";

import AboutAomi from "../../content/docs/about-aomi.mdx";
import Architecture from "../../content/docs/architecture.mdx";
import NpmPackage from "../../content/docs/npm-package.mdx";
import Cli from "../../content/docs/cli.mdx";
import Sdk from "../../content/docs/sdk.mdx";
import Components from "../../content/docs/components.mdx";
import Styling from "../../content/docs/styling.mdx";
import Customization from "../../content/docs/customization.mdx";
import Examples from "../../content/docs/examples.mdx";
import Runtime from "../../content/docs/runtime.mdx";
import AomiApps from "../../content/docs/aomi-apps.mdx";
import ScriptGeneration from "../../content/docs/script-generation.mdx";
import Execution from "../../content/docs/execution.mdx";
import Evals from "../../content/docs/evals.mdx";
import PlatformSupport from "../../content/docs/platform-support.mdx";

export type DocEntry = {
  slug: string;
  title: string;
  description: string;
  section: string;
  Component: ComponentType;
};

export const docsEntries: DocEntry[] = [
  {
    slug: "about-aomi",
    title: "About Aomi Labs",
    description: "",
    section: "Introduction",
    Component: AboutAomi,
  },
  {
    slug: "architecture",
    title: "Architecture",
    description: "",
    section: "Introduction",
    Component: Architecture,
  },
  {
    slug: "npm-package",
    title: "NPM Package",
    description: "",
    section: "Quickstart",
    Component: NpmPackage,
  },
  {
    slug: "cli",
    title: "CLI",
    description: "",
    section: "Quickstart",
    Component: Cli,
  },
  {
    slug: "sdk",
    title: "SDK",
    description: "",
    section: "Quickstart",
    Component: Sdk,
  },
  {
    slug: "components",
    title: "Components",
    description: "",
    section: "UI",
    Component: Components,
  },
  {
    slug: "styling",
    title: "Styling",
    description: "",
    section: "UI",
    Component: Styling,
  },
  {
    slug: "customization",
    title: "Customization",
    description: "",
    section: "UI",
    Component: Customization,
  },
  {
    slug: "examples",
    title: "Examples",
    description: "",
    section: "UI",
    Component: Examples,
  },
  {
    slug: "runtime",
    title: "Runtime",
    description: "",
    section: "Guides",
    Component: Runtime,
  },
  {
    slug: "aomi-apps",
    title: "Aomi Apps",
    description: "",
    section: "Guides",
    Component: AomiApps,
  },
  {
    slug: "script-generation",
    title: "Script Generation",
    description: "",
    section: "Guides",
    Component: ScriptGeneration,
  },
  {
    slug: "execution",
    title: "Execution",
    description: "",
    section: "Guides",
    Component: Execution,
  },
  {
    slug: "evals",
    title: "Evals",
    description: "",
    section: "Guides",
    Component: Evals,
  },
  {
    slug: "platform-support",
    title: "Platform Support",
    description: "",
    section: "Integration",
    Component: PlatformSupport,
  },
];

export type DocSection = {
  title: string;
  items: DocEntry[];
};

export const docSections: DocSection[] = [
  {
    title: "Introduction",
    items: docsEntries.filter((doc) => doc.section === "Introduction"),
  },
  {
    title: "Quickstart",
    items: docsEntries.filter((doc) => doc.section === "Quickstart"),
  },
  {
    title: "UI",
    items: docsEntries.filter((doc) => doc.section === "UI"),
  },
  {
    title: "Guides",
    items: docsEntries.filter((doc) => doc.section === "Guides"),
  },
  {
    title: "Integration",
    items: docsEntries.filter((doc) => doc.section === "Integration"),
  },
];

export function getDocBySlug(slug: string) {
  return docsEntries.find((doc) => doc.slug === slug);
}

export const defaultDocSlug = docsEntries[0]?.slug ?? "about-aomi";
