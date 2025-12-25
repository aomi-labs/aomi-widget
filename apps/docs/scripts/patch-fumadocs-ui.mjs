import fs from "node:fs";
import path from "node:path";
const sidebarPath = path.join(
  process.cwd(),
  "node_modules",
  "fumadocs-ui",
  "dist",
  "layouts",
  "docs",
  "sidebar.js",
);

const originalExport =
  "export const { SidebarProvider: Sidebar, SidebarFolder, SidebarCollapseTrigger, SidebarViewport, SidebarTrigger, } = Base;";
const patchedExport =
  "export { SidebarProvider as Sidebar, SidebarFolder, SidebarCollapseTrigger, SidebarViewport, SidebarTrigger } from \"../../components/sidebar/base.js\";";

function patchSidebar() {
  if (!fs.existsSync(sidebarPath)) {
    console.warn(`[patch-fumadocs-ui] sidebar.js not found at ${sidebarPath}`);
    return;
  }

  const source = fs.readFileSync(sidebarPath, "utf8");

  if (source.includes(patchedExport)) {
    return; // already patched
  }

  if (!source.includes(originalExport)) {
    console.warn(
      "[patch-fumadocs-ui] expected export statement not found; skipping patch",
    );
    return;
  }

  const updated = source.replace(originalExport, patchedExport);
  fs.writeFileSync(sidebarPath, updated);
}

patchSidebar();
