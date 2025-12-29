import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { api } from "@/lib/source";
import { baseLayoutOptions, sharedSidebarOptions } from "../layout-config";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseLayoutOptions}
      tree={api.pageTree}
      tabMode="sidebar"
      sidebar={sharedSidebarOptions}
    >
      {children}
    </DocsLayout>
  );
}
