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
      aomi("assistant-threadlist-collapsible"),
      aomi("notification"),
      // shadcn primitives
      "collapsible",
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
    registryDependencies: [aomi("assistant-thread-list"), "sidebar"],
    description: "Sidebar shell for thread navigation and wallet footer slot.",
  },
  {
    name: "assistant-threadlist-collapsible",
    file: "components/assistant-ui/threadlist-collapsible.tsx",
    dependencies: ["lucide-react", "next"],
    registryDependencies: [
      aomi("assistant-thread-list"),
      "collapsible",
      "button",
      "separator",
    ],
    description:
      "Collapsible shell for thread navigation and wallet footer slot.",
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
    description:
      "Notification toaster wired to the runtime notification store.",
  },
  {
    name: "sonner",
    file: "components/ui/sonner.tsx",
    dependencies: ["sonner"],
    description: "Shadcn wrapper for Sonner toasts.",
  },
  // === SHADCN UI PRIMITIVES ===
  {
    name: "button",
    file: "components/ui/button.tsx",
    dependencies: ["@radix-ui/react-slot", "class-variance-authority"],
    description: "Displays a button or a component that looks like a button.",
  },
  {
    name: "input",
    file: "components/ui/input.tsx",
    dependencies: [],
    description:
      "Displays a form input field or a component that looks like an input field.",
  },
  {
    name: "label",
    file: "components/ui/label.tsx",
    dependencies: [],
    description: "Renders an accessible label associated with controls.",
  },
  {
    name: "card",
    file: "components/ui/card.tsx",
    dependencies: [],
    description: "Displays a card with header, content, and footer.",
  },
  {
    name: "badge",
    file: "components/ui/badge.tsx",
    dependencies: ["class-variance-authority"],
    description: "Displays a badge or a component that looks like a badge.",
  },
  {
    name: "avatar",
    file: "components/ui/avatar.tsx",
    dependencies: ["@radix-ui/react-avatar"],
    description: "An image element with a fallback for representing the user.",
  },
  {
    name: "skeleton",
    file: "components/ui/skeleton.tsx",
    dependencies: [],
    description: "Use to show a placeholder while content is loading.",
  },
  {
    name: "tooltip",
    file: "components/ui/tooltip.tsx",
    dependencies: ["@radix-ui/react-tooltip"],
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
  {
    name: "separator",
    file: "components/ui/separator.tsx",
    dependencies: ["@radix-ui/react-separator"],
    description: "Visually or semantically separates content.",
  },
  {
    name: "breadcrumb",
    file: "components/ui/breadcrumb.tsx",
    dependencies: ["@radix-ui/react-slot"],
    description:
      "Displays the path to the current resource using a hierarchy of links.",
  },
  {
    name: "sidebar",
    file: "components/ui/sidebar.tsx",
    dependencies: ["@radix-ui/react-slot", "class-variance-authority"],
    description: "Displays a sidebar navigation component.",
  },
  {
    name: "dialog",
    file: "components/ui/dialog.tsx",
    dependencies: ["@radix-ui/react-dialog", "lucide-react"],
    description:
      "A window overlaid on either the primary window or another dialog window.",
  },
  {
    name: "sheet",
    file: "components/ui/sheet.tsx",
    dependencies: ["@radix-ui/react-dialog", "lucide-react"],
    description:
      "Extends the Dialog component to display content that complements the main content of the screen.",
  },
  {
    name: "collapsible",
    file: "components/ui/collapsible.tsx",
    dependencies: ["@radix-ui/react-collapsible"],
    description: "An interactive component which expands/collapses a panel.",
  },
  {
    name: "command",
    file: "components/ui/command.tsx",
    dependencies: ["@radix-ui/react-dialog", "cmdk", "lucide-react"],
    registryDependencies: ["dialog"],
    description: "Fast, composable, unstyled command menu for React.",
  },
  {
    name: "popover",
    file: "components/ui/popover.tsx",
    dependencies: ["@radix-ui/react-popover"],
    description: "Displays rich content in a portal, triggered by a button.",
  },
  {
    name: "alert",
    file: "components/ui/alert.tsx",
    dependencies: ["class-variance-authority"],
    description: "Displays a callout for user attention.",
  },
  {
    name: "accordion",
    file: "components/ui/accordion.tsx",
    dependencies: ["@radix-ui/react-accordion", "lucide-react"],
    description:
      "A vertically stacked set of interactive headings that each reveal a section of content.",
  },
  {
    name: "drawer",
    file: "components/ui/drawer.tsx",
    dependencies: ["vaul"],
    description:
      "A drawer component for mobile navigation menus and similar interfaces.",
  },
];
