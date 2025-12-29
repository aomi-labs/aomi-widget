import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { baseLayoutOptions, navTabs, sharedSidebarOptions } from "../layout-config";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseLayoutOptions}
      // nav={{ ...baseLayoutOptions.nav, mode: "top" }}
      nav={{ ...baseLayoutOptions.nav}}
      tree={source.pageTree}
      tabMode="top"
      sidebar={{ ...sharedSidebarOptions, tabs: navTabs }}
    >
      {children}
    </DocsLayout>
  );
}
