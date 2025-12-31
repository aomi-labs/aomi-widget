import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const navLinks: NonNullable<BaseLayoutProps["links"]> = [
  {
    text: "Documentation",
    url: "/docs/about-aomi",
    active: "nested-url",
  },
  {
    text: "Examples",
    url: "/examples/metamask",
    active: "nested-url",
  },
  {
    text: "API Reference",
    url: "/api/sessions",
    active: "nested-url",
  },
];

export const navTabs = [
  { title: "Documentation", url: "/docs/about-aomi" },
  { title: "Examples", url: "/examples/metamask" },
  { title: "API Reference", url: "/api/sessions" },
];

export const baseLayoutOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/aomi-labs/aomi-widget",
  nav: {
    title: "aomi labs",
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
