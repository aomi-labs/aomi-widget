export type RegistryComponent = {
  name: string;
  file: string;
  dependencies?: string[];
  registryDependencies?: string[];
  description?: string;
};

const sharedDependencies = [
  "@aomi-labs/react",
  "@assistant-ui/react",
  "motion",
  "lucide-react",
];

const sharedRegistryDependencies = [
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
  "tooltip-icon-button",
  "attachment",
  "markdown-text",
];

export const registry: RegistryComponent[] = [
  {
    name: "aomi-frame",
    file: "components/aomi-frame.tsx",
    dependencies: sharedDependencies,
    registryDependencies: sharedRegistryDependencies,
    description: "Full assistant shell with thread list and runtime wiring.",
  },
  {
    name: "assistant-thread",
    file: "components/assistant-ui/thread.tsx",
    dependencies: sharedDependencies,
    registryDependencies: sharedRegistryDependencies,
    description: "Chat surface built on @assistant-ui primitives.",
  },
  {
    name: "assistant-thread-list",
    file: "components/assistant-ui/thread-list.tsx",
    dependencies: sharedDependencies,
    registryDependencies: sharedRegistryDependencies,
    description: "Thread list wrapper wired to runtime adapter.",
  },
  {
    name: "assistant-threadlist-sidebar",
    file: "components/assistant-ui/threadlist-sidebar.tsx",
    dependencies: sharedDependencies,
    registryDependencies: sharedRegistryDependencies,
    description: "Sidebar shell for thread navigation and wallet footer slot.",
  },
  {
    name: "assistant-tool-fallback",
    file: "components/assistant-ui/tool-fallback.tsx",
    dependencies: sharedDependencies,
    registryDependencies: sharedRegistryDependencies,
    description: "Fallback renderer for assistant tool calls.",
  },
];
