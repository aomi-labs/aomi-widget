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
      url: "/docs",
    },
    {
      text: "Examples",
      url: "/examples",
      active: "nested-url",
    },
    {
      text: "API Reference",
      url: "/docs/api",
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
