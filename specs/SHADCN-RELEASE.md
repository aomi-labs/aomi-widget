(new design)

# MONOREPO Structure

aomi-widget/
├── apps/
│ ├── registry/ # shadcn registry → served at aomi.com/r/
│ │ ├── package.json
│ │ ├── components.json
│ │ ├── scripts/
│ │ │ └── build-registry.ts
│ │ ├── src/
│ │ │ ├── registry.ts
│ │ │ └── components/
│ │ │ ├── aomi-frame.tsx
│ │ │ └── assistant-ui/
│ │ │ ├── thread.tsx
│ │ │ ├── thread-list.tsx
│ │ │ ├── threadlist-sidebar.tsx
│ │ │ └── tool-fallback.tsx
│ │ └── dist/ # Generated JSON
│ │ └── aomi-frame.json
│ │
│ └── docs/ # Documentation site
│
├── packages/
│ └── react/ # @aomi-labs/react → npm
│ ├── package.json
│ └── src/
│ ├── api/
│ ├── runtime/
│ ├── state/
│ └── utils/
│
├── pnpm-workspace.yaml
└── package.json

---

Benefits of This Split

| packages/react                   | apps/registry                |
| -------------------------------- | ---------------------------- |
| Versioned via npm                | Versioned via git/deployment |
| npm install @aomi-labs/react     | npx shadcn add https://...   |
| Users can't edit                 | Users edit after install     |
| Breaking changes = major version | Users control when to update |
| Logic, hooks, types              | UI components                |

---

pnpm-workspace.yaml

packages:

- "packages/\*"
- "apps/\*"

---

Summary

- packages/react → npm package (logic)
- apps/registry → deployed static files (UI)
- apps/docs → optional docs site

# User Flow

1. npm package (@aomi-labs/react) - Logic you version and publish
2. shadcn registry - UI components users copy into their project

---

What Goes Where

@aomi-labs/react (npm package)

@aomi-labs/react/
├── src/
│ ├── api/
│ │ ├── client.ts # AomiApiClient
│ │ └── types.ts # API types
│ │
│ ├── runtime/
│ │ ├── aomi-runtime.tsx # AomiRuntimeProvider
│ │ ├── thread-list-adapter.ts
│ │ ├── polling.ts
│ │ └── hooks.ts # useRuntimeActions
│ │
│ ├── state/
│ │ └── thread-context.tsx # ThreadContextProvider
│ │
│ ├── conversion.ts
│ └── index.ts # exports

Exports:
// @aomi-labs/react
export { AomiApiClient } from './api/client';
export { AomiRuntimeProvider } from './runtime/aomi-runtime';
export { useRuntimeActions } from './runtime/hooks';
export { ThreadContextProvider, useThreadContext } from './state/thread-context';
export type { SessionMessage, ThreadMetadata, ... } from './api/types';

---

shadcn Registry (UI only)

registry/
├── components/
│ ├── aomi-frame.tsx # Entry point
│ └── assistant-ui/
│ ├── thread.tsx # Wallet suggestions, animations
│ ├── thread-list.tsx # Delete vs Archive
│ ├── threadlist-sidebar.tsx # Aomi branding
│ └── tool-fallback.tsx # Simplified

---

Registry Definition

export const registry = [
{
name: "aomi-frame",
type: "registry:component",
files: [
{ path: "components/aomi-frame.tsx", type: "registry:component" },
{ path: "components/assistant-ui/thread.tsx", type: "registry:component" },
{ path: "components/assistant-ui/thread-list.tsx", type: "registry:component" },
{ path: "components/assistant-ui/threadlist-sidebar.tsx", type: "registry:component" },
{ path: "components/assistant-ui/tool-fallback.tsx", type: "registry:component" },
],
dependencies: [
"@aomi-labs/react", // Your logic package
"@assistant-ui/react", // Primitives
"motion", // Animations
],
registryDependencies: [
// shadcn
"button", "sidebar", "sheet", "tooltip", "avatar",
"dialog", "separator", "input", "skeleton",
// assistant-ui
"https://r.assistant-ui.com/tooltip-icon-button.json",
"https://r.assistant-ui.com/attachment.json",
],
},
];

---

Benefits

| Aspect           | npm package         | shadcn registry       |
| ---------------- | ------------------- | --------------------- |
| Versioning       | semver, changelogs  | User controls updates |
| Updates          | npm update          | Manual re-add         |
| Customization    | Limited (use hooks) | Full (edit source)    |
| Breaking changes | You manage          | User manages          |

---

User Experience

# Install everything

npx shadcn add https://aomi.com/r/aomi-frame.json

# This automatically:

# 1. npm install @aomi-labs/react @assistant-ui/react motion

# 2. npm install shadcn deps (button, sidebar, etc.)

# 3. Copies UI files to components/

---

aomi-frame.tsx Now Imports from Package

// components/aomi-frame.tsx
import {
AomiRuntimeProvider,
ThreadContextProvider,
useRuntimeActions
} from "@aomi-labs/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";

export function AomiFrame({ backendUrl, publicKey, children }) {
return (
<ThreadContextProvider>
<AomiRuntimeProvider backendUrl={backendUrl} publicKey={publicKey}>
<SidebarProvider>
<ThreadListSidebar />
<Thread />
</SidebarProvider>
</AomiRuntimeProvider>
</ThreadContextProvider>
);
}

---

File Count

| Location              | Files | Published via        |
| --------------------- | ----- | -------------------- |
| @aomi-labs/react      | ~8    | npm                  |
| shadcn registry       | 5     | Your registry URL    |
| Reused (shadcn)       | 10+   | registryDependencies |
| Reused (assistant-ui) | 2     | registryDependencies |
