import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const navLinks: NonNullable<BaseLayoutProps["links"]> = [
  {
    text: "Guides",
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
  { title: "Guides", url: "/docs/about-aomi" },
  { title: "Examples", url: "/examples/metamask" },
  { title: "API Reference", url: "/api/sessions" },
];

export const baseLayoutOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/aomi-labs/aomi-widget",
  nav: {
    title: (
      <span className="flex items-center gap-2">
        <img
          src="/assets/images/bubble.svg"
          alt="Aomi"
          className="h-5 w-5 invert"
        />
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
