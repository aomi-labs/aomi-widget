# Migration Plan — Consolidated (Claude + Codex)

Migrate the single `aomi-widget` package into a monorepo split: logic as an npm package, UI as a shadcn registry, docs as the playground/validator.

## Targets
- `packages/react` → `@aomi-labs/react` (logic: runtime, hooks, API, state, utils).
- `apps/registry` → shadcn-compatible registry (UI components + JSON build).
- `apps/docs` → consumes both to validate integration.
- Workspace: `pnpm-workspace.yaml` covers `packages/*`, `apps/*`.

## Architecture (goal state)
```
aomi/
├─ packages/react/                # npm package
│  ├─ src/
│  │  ├─ api/ (client, types)
│  │  ├─ runtime/ (aomi-runtime, polling, thread-list-adapter, message-handlers, hooks)
│  │  ├─ state/ (thread-context, types)
│  │  ├─ utils/ (conversion, wallet)
│  │  └─ index.ts (exports)
│  ├─ package.json
│  └─ tsup.config.ts
├─ apps/registry/                 # shadcn registry
│  ├─ src/registry.ts
│  ├─ src/components/
│  │  ├─ aomi-frame.tsx
│  │  └─ assistant-ui/{thread.tsx,thread-list.tsx,threadlist-sidebar.tsx,tool-fallback.tsx}
│  ├─ components.json
│  ├─ scripts/build-registry.ts
│  └─ dist/*.json
├─ apps/docs/                     # docs playground
└─ pnpm-workspace.yaml
```

## Phased Plan
### Phase 1 — Workspace + skeleton
- Add `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root scripts (`build`, `lint`, `typecheck`).
- Create folders for `packages/react` and `apps/registry`; add minimal `package.json` and tsconfig/tsup stubs.

### Phase 2 — Extract logic to `packages/react`
- Move logic files: `lib/backend-api.ts` → `src/api/client.ts`; `lib/types.ts` → `src/api/types.ts` and `src/state/types.ts`; `lib/thread-context.tsx` → `src/state/thread-context.tsx`; `lib/conversion.ts` → `src/utils/conversion.ts`; `utils/wallet.ts` → `src/utils/wallet.ts`.
- Split `components/assistant-ui/runtime.tsx` into:
  - `src/runtime/aomi-runtime.tsx` (orchestration)
  - `src/runtime/polling.ts` (poller)
  - `src/runtime/thread-list-adapter.ts` (thread list adapter)
  - `src/runtime/message-handlers.ts` (onNew/onCancel/system)
  - `src/runtime/hooks.ts` (context for runtime actions)
- Create `src/index.ts` exporting API, runtime, state, utils; set `package.json` exports (esm/cjs/types) and peer deps (`react`, `@assistant-ui/react`).
- Build config: `tsup` with dts, esm/cjs, external peer deps.

### Phase 3 — Isolate registry UI
- Move UI files to `apps/registry/src/components` (aomi-frame + assistant-ui set).
- Registry definition (`src/registry.ts`): list publishable files only; add `dependencies` (`@aomi-labs/react`, `@assistant-ui/react`, `motion`) and `registryDependencies` (shadcn primitives: button, sidebar, sheet, tooltip, avatar, dialog, separator, input, skeleton, breadcrumb; assistant-ui: tooltip-icon-button, attachment, markdown-text URLs).
- `components.json` aligned with shadcn (style new-york, aliases).
- `scripts/build-registry.ts`: read listed files, embed content, write `dist/<name>.json` + `index.json`.
- Update imports in UI to pull logic from `@aomi-labs/react`.

### Phase 4 — Docs integration
- Point docs to local package via alias (next/tsconfig) and import library styles.
- Optionally consume registry source/dist to mirror consumer setup.
- Smoke test core flows: thread list, popovers/charts, wallet footer render, theme overrides.

### Phase 5 — Tooling, release, verification
- Lint/typecheck: `pnpm lint`, `pnpm typecheck`.
- Build: `pnpm build` (package + registry; ensure themes/styles copied).
- Changesets: add user-facing changes, run `pnpm changeset version`.
- Publish: `pnpm publish --access public` (or `changeset publish`) for `@aomi-labs/react`; deploy registry `dist/` to hosting.
- Post-publish: fresh install test (`npx shadcn add <registry-url>` + `pnpm add @aomi-labs/react@X.Y.Z`), verify CSS import and UI rendering.

## File Mapping (detailed)
| Source (aomi-widget) | Destination |
| --- | --- |
| `lib/backend-api.ts` | `packages/react/src/api/client.ts` |
| `lib/types.ts` (API/state) | `packages/react/src/api/types.ts`, `packages/react/src/state/types.ts` |
| `lib/thread-context.tsx` | `packages/react/src/state/thread-context.tsx` |
| `lib/conversion.ts` | `packages/react/src/utils/conversion.ts` |
| `utils/wallet.ts` | `packages/react/src/utils/wallet.ts` |
| `components/assistant-ui/runtime.tsx` | split into runtime files listed above |
| `components/aomi-frame.tsx` | `apps/registry/src/components/aomi-frame.tsx` |
| `components/assistant-ui/{thread,thread-list,threadlist-sidebar,tool-fallback}.tsx` | `apps/registry/src/components/assistant-ui/` |
| Not published (via registryDependencies) | shadcn primitives (button, sidebar, sheet, tooltip, avatar, dialog, separator, input, skeleton, breadcrumb); assistant-ui primitives (tooltip-icon-button, attachment, markdown-text) |

## Commands (baseline)
- Root: `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Registry: `pnpm --filter registry build`.
- Docs smoke: `pnpm --filter docs dev` (manual check).
- Release: `pnpm changeset version` → commit → `pnpm build` → tag → `pnpm publish --access public` (or `changeset publish`) + deploy registry.

## Risks & Mitigations
- **Missing CSS vars/tokens**: keep `src/themes/default.css` parity; verify popovers/charts in docs.
- **Alias drift**: lock tsconfig/next aliases; add lint/ts checks for unresolved imports.
- **Registry dependency drift**: maintain a single `registryDependencies` list; pin versions as needed.
- **Packaging gaps**: ensure exports include types and esm/cjs (or module-only) and mark peers external.

## Validation Checklist
- Logic package builds and types ok (`packages/react/dist` present, correct exports).
- Registry `dist/*.json` includes file contents and correct dependency lists.
- Docs render sidebar/thread/wallet footer; popover/chart tokens resolved; theme overrides work.
- Fresh consumer install via `shadcn add <registry-url>` + `pnpm add @aomi-labs/react@X.Y.Z` succeeds.



ELABORATION

## Migration Steps

### Phase 1: Create Monorepo Structure

\```bash
# 1. Create new directory structure
mkdir -p aomi/packages/react/src/{api,runtime,state,utils}
mkdir -p aomi/apps/registry/src/components/assistant-ui
mkdir -p aomi/apps/registry/scripts

# 2. Initialize workspace
cd aomi
pnpm init
\```

#### `pnpm-workspace.yaml`
\```yaml
packages:
  - "packages/*"
  - "apps/*"
\```

#### Root `package.json`
\```json
{
  "name": "aomi",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
\```

---

### Phase 2: Extract Logic to `packages/react`

#### File Mapping

| Source (aomi-widget) | Destination (packages/react) |
|----------------------|------------------------------|
| `lib/backend-api.ts` | `src/api/client.ts` |
| `lib/types.ts` (API types) | `src/api/types.ts` |
| `lib/thread-context.tsx` | `src/state/thread-context.tsx` |
| `lib/types.ts` (state types) | `src/state/types.ts` |
| `lib/conversion.ts` | `src/utils/conversion.ts` |
| `utils/wallet.ts` | `src/utils/wallet.ts` |
| `components/assistant-ui/runtime.tsx` | Split into: |
| ↳ Provider logic | `src/runtime/aomi-runtime.tsx` |
| ↳ Thread list adapter | `src/runtime/thread-list-adapter.ts` |
| ↳ Message handlers | `src/runtime/message-handlers.ts` |
| ↳ Polling logic | `src/runtime/polling.ts` |
| ↳ useRuntimeActions | `src/runtime/hooks.ts` |

#### `packages/react/package.json`
\```json
{
  "name": "@aomi-labs/react",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "@assistant-ui/react": ">=0.5.0",
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "@assistant-ui/react": "^0.5.0",
    "react": "^18.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
\```

#### `packages/react/tsup.config.ts`
\```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "@assistant-ui/react"],
});
\```

#### `packages/react/src/index.ts`
\```typescript
// API
export { AomiApiClient } from "./api/client";
export type * from "./api/types";

// Runtime
export { AomiRuntimeProvider } from "./runtime/aomi-runtime";
export { useRuntimeActions } from "./runtime/hooks";

// State
export { ThreadContextProvider, useThreadContext } from "./state/thread-context";
export type * from "./state/types";

// Utils
export { constructThreadMessage, constructSystemMessage } from "./utils/conversion";
export { formatAddress, getNetworkName } from "./utils/wallet";
\```

---

### Phase 3: Extract UI to `apps/registry`

#### File Mapping

| Source (aomi-widget) | Destination (apps/registry) |
|----------------------|----------------------------|
| `components/aomi-frame.tsx` | `src/components/aomi-frame.tsx` |
| `components/assistant-ui/thread.tsx` | `src/components/assistant-ui/thread.tsx` |
| `components/assistant-ui/thread-list.tsx` | `src/components/assistant-ui/thread-list.tsx` |
| `components/assistant-ui/threadlist-sidebar.tsx` | `src/components/assistant-ui/threadlist-sidebar.tsx` |
| `components/assistant-ui/tool-fallback.tsx` | `src/components/assistant-ui/tool-fallback.tsx` |

#### Components NOT migrated (use via registryDependencies)

| Component | Source |
|-----------|--------|
| `tooltip-icon-button.tsx` | `https://r.assistant-ui.com/tooltip-icon-button.json` |
| `attachment.tsx` | `https://r.assistant-ui.com/attachment.json` |
| `button.tsx`, `sidebar.tsx`, etc. | shadcn (`"button"`, `"sidebar"`) |

#### `apps/registry/package.json`
\```json
{
  "name": "@aomi-labs/registry",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsx scripts/build-registry.ts",
    "dev": "tsx watch scripts/build-registry.ts"
  },
  "dependencies": {
    "@aomi-labs/react": "workspace:*"
  },
  "devDependencies": {
    "@assistant-ui/react": "^0.5.0",
    "motion": "^11.0.0",
    "react": "^18.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
\```

#### `apps/registry/components.json`
\```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
\```

#### `apps/registry/src/registry.ts`
\```typescript
export const registry = [
  {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: "aomi-frame",
    type: "registry:component",
    title: "Aomi Frame",
    description: "Complete AI chat interface with wallet integration",
    files: [
      {
        path: "components/aomi-frame.tsx",
        type: "registry:component",
      },
      {
        path: "components/assistant-ui/thread.tsx",
        type: "registry:component",
      },
      {
        path: "components/assistant-ui/thread-list.tsx",
        type: "registry:component",
      },
      {
        path: "components/assistant-ui/threadlist-sidebar.tsx",
        type: "registry:component",
      },
      {
        path: "components/assistant-ui/tool-fallback.tsx",
        type: "registry:component",
      },
    ],
    dependencies: [
      "@aomi-labs/react",
      "@assistant-ui/react",
      "motion",
    ],
    registryDependencies: [
      // shadcn base components
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
      // assistant-ui components
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/markdown-text.json",
    ],
  },
];
\```

#### `apps/registry/scripts/build-registry.ts`
\```typescript
import fs from "fs";
import path from "path";
import { registry } from "../src/registry";

const DIST_DIR = path.join(process.cwd(), "dist");

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Build each registry item
for (const item of registry) {
  const files = item.files?.map((file) => {
    const filePath = path.join(process.cwd(), "src", file.path);
    const content = fs.readFileSync(filePath, "utf8");
    return {
      ...file,
      content,
    };
  });

  const output = {
    ...item,
    files,
  };

  const outputPath = path.join(DIST_DIR, `${item.name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Generated: ${outputPath}`);
}

// Generate index
const index = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "aomi-registry",
  homepage: "https://aomi.com",
  items: registry.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
  })),
};

fs.writeFileSync(
  path.join(DIST_DIR, "index.json"),
  JSON.stringify(index, null, 2)
);
console.log("Generated: index.json");
\```

---

### Phase 4: Update Component Imports

After migration, update imports in UI components:

#### Before (aomi-widget)
\```typescript
// components/aomi-frame.tsx
import { BackendApi } from "../lib/backend-api";
import { ThreadContextProvider } from "../lib/thread-context";
import { AomiRuntimeProvider } from "./assistant-ui/runtime";
\```

#### After (apps/registry)
\```typescript
// components/aomi-frame.tsx
import {
  AomiRuntimeProvider,
  ThreadContextProvider,
  useRuntimeActions,
} from "@aomi-labs/react";
\```

---

### Phase 5: Refactor runtime.tsx (760 lines → ~5 files)

This is the most complex part. The current `runtime.tsx` needs to be split:

#### 1. `packages/react/src/api/client.ts`
Extract from `lib/backend-api.ts` (already exists, just move):
\```typescript
export class AomiApiClient {
  constructor(private baseUrl: string) {}

  async fetchState(sessionId: string): Promise<SessionResponse> { ... }
  async postChatMessage(...): Promise<SessionResponse> { ... }
  async postSystemMessage(...): Promise<SystemResponse> { ... }
  // ... other methods

  subscribeToUpdates(onUpdate: (update) => void): () => void { ... }
}
\```

#### 2. `packages/react/src/runtime/polling.ts`
Extract polling logic from runtime.tsx:
\```typescript
export function usePolling(
  api: AomiApiClient,
  sessionId: string,
  onMessages: (messages: ThreadMessage[]) => void
) {
  const [isRunning, setIsRunning] = useState(false);

  const poll = useCallback(async () => {
    // ... polling logic from runtime.tsx
  }, [api, sessionId]);

  return { isRunning, poll, startPolling, stopPolling };
}
\```

#### 3. `packages/react/src/runtime/thread-list-adapter.ts`
Extract the ExternalStoreThreadListAdapter:
\```typescript
export function useThreadListAdapter(
  api: AomiApiClient,
  threadContext: ThreadContextValue
): ExternalStoreThreadListAdapter {
  // ... ~200 lines of adapter logic from runtime.tsx
  return {
    threads,
    archivedThreads,
    newThread,
    switchToThread,
    switchToNewThread,
    rename,
    archive,
    unarchive,
    delete: deleteThread,
  };
}
\```

#### 4. `packages/react/src/runtime/message-handlers.ts`
Extract onNew, onCancel, sendSystemMessage:
\```typescript
export function useMessageHandlers(
  api: AomiApiClient,
  polling: ReturnType<typeof usePolling>,
  threadContext: ThreadContextValue
) {
  const onNew = useCallback(async (message: AppendMessage) => {
    // ... message handling logic
  }, [...]);

  const onCancel = useCallback(async () => {
    // ... cancel logic
  }, [...]);

  const sendSystemMessage = useCallback(async (content: string) => {
    // ... system message logic
  }, [...]);

  return { onNew, onCancel, sendSystemMessage };
}
\```

#### 5. `packages/react/src/runtime/aomi-runtime.tsx`
The clean orchestration layer:
\```typescript
import { useExternalStoreRuntime, AssistantRuntimeProvider } from "@assistant-ui/react";
import { usePolling } from "./polling";
import { useThreadListAdapter } from "./thread-list-adapter";
import { useMessageHandlers } from "./message-handlers";
import { useThreadContext } from "../state/thread-context";
import { AomiApiClient } from "../api/client";

interface AomiRuntimeProviderProps {
  backendUrl: string;
  publicKey: string;
  children: React.ReactNode;
}

export function AomiRuntimeProvider({
  backendUrl,
  publicKey,
  children
}: AomiRuntimeProviderProps) {
  const api = useMemo(() => new AomiApiClient(backendUrl), [backendUrl]);
  const threadContext = useThreadContext();

  const polling = usePolling(api, threadContext.currentSessionId);
  const threadListAdapter = useThreadListAdapter(api, threadContext);
  const messageHandlers = useMessageHandlers(api, polling, threadContext);

  const runtime = useExternalStoreRuntime({
    messages: polling.messages,
    isRunning: polling.isRunning,
    onNew: messageHandlers.onNew,
    onCancel: messageHandlers.onCancel,
    adapters: {
      threadList: threadListAdapter,
    },
  });

  return (
    <RuntimeActionsContext.Provider value={messageHandlers}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
\```

#### 6. `packages/react/src/runtime/hooks.ts`
\```typescript
import { createContext, useContext } from "react";

interface RuntimeActions {
  sendSystemMessage: (content: string) => Promise<void>;
}

export const RuntimeActionsContext = createContext<RuntimeActions | null>(null);

export function useRuntimeActions(): RuntimeActions {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}
\```

---

## Deployment

### npm Package (`@aomi-labs/react`)
\```bash
cd packages/react
pnpm build
npm publish --access public
\```

### Registry (static hosting)
\```bash
cd apps/registry
pnpm build
# Deploy dist/ to https://aomi.com/r/
\```

---

## User Installation

\```bash
# Installs everything
npx shadcn add https://aomi.com/r/aomi-frame.json

# This will:
# 1. npm install @aomi-labs/react @assistant-ui/react motion
# 2. npm install shadcn deps (button, sidebar, etc.)
# 3. Fetch assistant-ui deps (tooltip-icon-button, attachment)
# 4. Copy UI files to user's components/
\```

---

## Checklist

### Phase 1: Monorepo Setup
- [ ] Create directory structure
- [ ] Initialize pnpm workspace
- [ ] Configure turbo.json (optional)
- [ ] Set up root package.json

### Phase 2: packages/react
- [ ] Create package.json with peer dependencies
- [ ] Set up tsup build config
- [ ] Move and refactor `lib/backend-api.ts` → `src/api/client.ts`
- [ ] Move `lib/types.ts` → `src/api/types.ts` + `src/state/types.ts`
- [ ] Move `lib/thread-context.tsx` → `src/state/thread-context.tsx`
- [ ] Move `lib/conversion.ts` → `src/utils/conversion.ts`
- [ ] Move `utils/wallet.ts` → `src/utils/wallet.ts`
- [ ] **Refactor runtime.tsx into:**
  - [ ] `src/runtime/aomi-runtime.tsx`
  - [ ] `src/runtime/thread-list-adapter.ts`
  - [ ] `src/runtime/message-handlers.ts`
  - [ ] `src/runtime/polling.ts`
  - [ ] `src/runtime/hooks.ts`
- [ ] Create `src/index.ts` with exports
- [ ] Build and test locally

### Phase 3: apps/registry
- [ ] Create package.json
- [ ] Create components.json
- [ ] Move UI components (5 files)
- [ ] Update imports to use `@aomi-labs/react`
- [ ] Create `src/registry.ts`
- [ ] Create `scripts/build-registry.ts`
- [ ] Build and verify JSON output

### Phase 4: Testing
- [ ] Create test app that installs from registry
- [ ] Verify all dependencies resolve
- [ ] Verify components render correctly

### Phase 5: Deployment
- [ ] Publish `@aomi-labs/react` to npm
- [ ] Deploy registry to hosting
- [ ] Update documentation
