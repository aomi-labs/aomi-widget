import type { ComponentType } from "react";

import AboutAomi from "../../content/about-aomi.mdx";
import Architecture from "../../content/architecture.mdx";
import NpmPackage from "../../content/npm-package.mdx";
import Cli from "../../content/cli.mdx";
import Sdk from "../../content/sdk.mdx";
import Api from "../../content/api.mdx";
import Components from "../../content/components.mdx";
import Styling from "../../content/styling.mdx";
import Customization from "../../content/customization.mdx";
import Examples from "../../content/examples.mdx";
import Runtime from "../../content/runtime.mdx";
import AomiApps from "../../content/aomi-apps.mdx";
import ScriptGeneration from "../../content/script-generation.mdx";
import Execution from "../../content/execution.mdx";
import Evals from "../../content/evals.mdx";
import ApiEndpoints from "../../content/api-endpoints.mdx";
import PlatformSupport from "../../content/platform-support.mdx";

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
    slug: "api",
    title: "API",
    description: "",
    section: "Quickstart",
    Component: Api,
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
    slug: "api-endpoints",
    title: "API Endpoints",
    description: "",
    section: "Integration",
    Component: ApiEndpoints,
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
