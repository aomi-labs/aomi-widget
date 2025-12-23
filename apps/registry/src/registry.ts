export type RegistryEntry = {
  name: string;
  files: string[];
  dependencies?: string[];
  registryDependencies?: string[];
};

const baseDependencies = ["@aomi-labs/react", "@assistant-ui/react", "motion"];

const shadcnPrimitives = [
  "button",
  "sidebar",
  "sheet",
  "tooltip",
  "avatar",
  "dialog",
  "separator",
  "input",
  "skeleton",
  "breadcrumb",
];

const assistantUiDependencies = [
  "tooltip-icon-button",
  "attachment",
  "markdown-text",
];

export const registry: RegistryEntry[] = [
  {
    name: "aomi-frame",
    files: ["components/aomi-frame.tsx"],
    dependencies: baseDependencies,
    registryDependencies: [
      ...shadcnPrimitives,
      ...assistantUiDependencies,
      "thread",
      "thread-list",
      "threadlist-sidebar",
    ],
  },
  {
    name: "thread",
    files: ["components/assistant-ui/thread.tsx"],
    dependencies: baseDependencies,
    registryDependencies: [...shadcnPrimitives, ...assistantUiDependencies],
  },
  {
    name: "thread-list",
    files: ["components/assistant-ui/thread-list.tsx"],
    dependencies: baseDependencies,
    registryDependencies: [...shadcnPrimitives, ...assistantUiDependencies],
  },
  {
    name: "threadlist-sidebar",
    files: ["components/assistant-ui/threadlist-sidebar.tsx", "components/assistant-ui/base-sidebar.tsx"],
    dependencies: baseDependencies,
    registryDependencies: [...shadcnPrimitives, ...assistantUiDependencies],
  },
  {
    name: "tool-fallback",
    files: ["components/assistant-ui/tool-fallback.tsx"],
    dependencies: baseDependencies,
    registryDependencies: [...shadcnPrimitives, ...assistantUiDependencies],
  },
  {
    name: "markdown-text",
    files: ["components/assistant-ui/markdown-text.tsx"],
    dependencies: baseDependencies,
    registryDependencies: shadcnPrimitives,
  },
  {
    name: "attachment",
    files: ["components/assistant-ui/attachment.tsx"],
    dependencies: baseDependencies,
    registryDependencies: shadcnPrimitives,
  },
  {
    name: "tooltip-icon-button",
    files: ["components/assistant-ui/tooltip-icon-button.tsx"],
    dependencies: baseDependencies,
    registryDependencies: shadcnPrimitives,
  },
  {
    name: "ui-primitives",
    files: [
      "components/ui/button.tsx",
      "components/ui/card.tsx",
      "components/ui/avatar.tsx",
      "components/ui/dialog.tsx",
      "components/ui/tooltip.tsx",
      "components/ui/badge.tsx",
      "components/ui/input.tsx",
      "components/ui/label.tsx",
      "components/ui/separator.tsx",
      "components/ui/sheet.tsx",
      "components/ui/skeleton.tsx",
      "components/ui/breadcrumb.tsx",
      "components/ui/sidebar.tsx",
    ],
    dependencies: baseDependencies,
    registryDependencies: shadcnPrimitives,
  },
];
