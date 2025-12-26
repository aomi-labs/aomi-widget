import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { examples } from "@/lib/source";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

// Shared configuration
const baseOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/aomi-labs/aomi-widget",
  nav: {
    title: "Aomi Widget",
    transparentMode: "none",
  },
  links: [
    {
      text: "Documentation",
      url: "/docs/about-aomi",
    },
    {
      text: "Examples",
      url: "/examples",
      active: "nested-url",
    },
    {
      text: "API Reference",
      url: "/api",
      active: "nested-url",
    },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions}
      tree={examples.pageTree}
      sidebar={{
        defaultOpenLevel: 0,
      }}
    >
      {children}
    </DocsLayout>
  );
}
