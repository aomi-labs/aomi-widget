export type RegistryComponent = {
  name: string;
  file: string;
  dependencies?: string[];
  registryDependencies?: string[];
  description?: string;
};

const REGISTRY_BASE_URL = "https://widget.aomi.dev/r";

// Helper to create registry dependency URLs
const aomi = (name: string) => `${REGISTRY_BASE_URL}/${name}.json`;
const assistantUI = (name: string) => `https://r.assistant-ui.com/${name}.json`;

export const registry: RegistryComponent[] = [
  // === AOMI CUSTOM COMPONENTS ===
  {
    name: "aomi-frame",
    file: "components/aomi-frame.tsx",
    dependencies: ["@aomi-labs/react"],
    registryDependencies: [
      // Internal aomi components (customized)
      aomi("assistant-thread"),
      aomi("assistant-threadlist-sidebar"),
      aomi("notification"),
      // shadcn primitives
      "sidebar",
      "separator",
      "breadcrumb",
    ],
    description: "Full assistant shell with thread list and runtime wiring.",
  },
  {
    name: "assistant-thread",
    file: "components/assistant-ui/thread.tsx",
    dependencies: [
      "@aomi-labs/react",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
    ],
    registryDependencies: [
      // From assistant-ui (unchanged)
      assistantUI("markdown-text"),
      assistantUI("tooltip-icon-button"),
      assistantUI("attachment"),
      // Internal aomi components (customized)
      aomi("assistant-tool-fallback"),
      // shadcn primitives
      "button",
    ],
    description: "Chat surface built on @assistant-ui primitives.",
  },
  {
    name: "assistant-thread-list",
    file: "components/assistant-ui/thread-list.tsx",
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      assistantUI("tooltip-icon-button"),
      "button",
      "skeleton",
    ],
    description: "Thread list wrapper wired to runtime adapter.",
  },
  {
    name: "assistant-threadlist-sidebar",
    file: "components/assistant-ui/threadlist-sidebar.tsx",
    dependencies: ["lucide-react"],
    registryDependencies: [
      aomi("assistant-thread-list"),
      "sidebar",
    ],
    description: "Sidebar shell for thread navigation and wallet footer slot.",
  },
  {
    name: "assistant-tool-fallback",
    file: "components/assistant-ui/tool-fallback.tsx",
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["button"],
    description: "Fallback renderer for assistant tool calls.",
  },
  {
    name: "notification",
    file: "components/ui/notification.tsx",
    dependencies: ["@aomi-labs/react", "sonner"],
    registryDependencies: [aomi("sonner")],
    description: "Notification toaster wired to the runtime notification store.",
  },
  {
    name: "sonner",
    file: "components/ui/sonner.tsx",
    dependencies: ["sonner"],
    description: "Shadcn wrapper for Sonner toasts.",
  },
];
