import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const navLinks: NonNullable<BaseLayoutProps["links"]> = [
  {
    text: "Documentation",
    url: "/docs/getting-started/overview",
    active: "nested-url",
  },
  {
    text: "Examples",
    url: "/examples/playground",
    active: "nested-url",
  },
];

export const navTabs = [
  { title: "Documentation", url: "/docs/getting-started/overview" },
  { title: "Examples", url: "/examples/playground" },
];

export const baseLayoutOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/aomi-labs/aomi-widget",
  nav: {
    title: (
      <span className="flex items-center gap-2">
        <img src="/assets/images/bubble.svg" alt="Aomi" className="h-5 w-5" />
        <span className="font-semibold tracking-tight">Aomi</span>
      </span>
    ),
    url: "https://aomi.dev",
    transparentMode: "none",
  },
  links: navLinks,
};

export const sharedSidebarOptions = {
  defaultOpenLevel: 0,
  tabs: false,
  collapsible: true,
};
