import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";
import { api } from "@/lib/source";
import {
  baseLayoutOptions,
  navTabs,
  sharedSidebarOptions,
} from "../layout-config";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseLayoutOptions}
      nav={{ ...baseLayoutOptions.nav, mode: "top" }}
      tree={api.pageTree}
      tabMode="navbar"
      sidebar={{ ...sharedSidebarOptions, tabs: navTabs }}
    >
      {children}
    </DocsLayout>
  );
}
