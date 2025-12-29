import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { baseLayoutOptions, sharedSidebarOptions } from "../layout-config";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseLayoutOptions}
      tree={source.pageTree}
      tabMode="sidebar"
      sidebar={sharedSidebarOptions}
    >
      {children}
    </DocsLayout>
  );
}
