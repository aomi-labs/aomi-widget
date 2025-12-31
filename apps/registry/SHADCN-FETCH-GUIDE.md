⏺ After running npx shadcn add https://r.aomi.dev/aomi-frame.json:

  File structure:
  their-project/
  ├── components.json          ← their config (already exists)
  ├── package.json             ← npm deps added
  ├── components/
  │   ├── aomi-frame.tsx                      ← from r.aomi.dev
  │   ├── assistant-ui/
  │   │   ├── thread.tsx                      ← from r.aomi.dev
  │   │   ├── thread-list.tsx                 ← from r.aomi.dev
  │   │   ├── threadlist-sidebar.tsx          ← from r.aomi.dev
  │   │   ├── tool-fallback.tsx               ← from r.aomi.dev
  │   │   ├── markdown-text.tsx               ← from r.assistant-ui.com
  │   │   ├── tooltip-icon-button.tsx         ← from r.assistant-ui.com
  │   │   └── attachment.tsx                  ← from r.assistant-ui.com
  │   └── ui/
  │       ├── button.tsx                      ← from shadcn
  │       ├── sidebar.tsx                     ← from shadcn
  │       ├── separator.tsx                   ← from shadcn
  │       ├── breadcrumb.tsx                  ← from shadcn
  │       ├── skeleton.tsx                    ← from shadcn
  │       ├── tooltip.tsx                     ← from shadcn
  │       ├── dialog.tsx                      ← from shadcn
  │       ├── avatar.tsx                      ← from shadcn
  │       └── ...
  └── lib/
      └── utils.ts                            ← cn() helper (from shadcn init)

  Their components.json (pre-existing, configured during npx shadcn init):
  {
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "new-york",
    "tailwind": {
      "baseColor": "neutral",
      "cssVariables": true
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils"
    }
  }

  Their package.json gets these added:
  {
    "dependencies": {
      "@aomi-labs/react": "^x.x.x",
      "@assistant-ui/react": "^0.11.x",
      "@assistant-ui/react-markdown": "^0.11.x",
      "lucide-react": "^0.x.x",
      "remark-gfm": "^4.x.x",
      "@radix-ui/react-tooltip": "...",
      "@radix-ui/react-dialog": "...",
      ...
    }
  }

  Usage in their code:
  import { AomiFrame } from "@/components/aomi-frame";

  export default function Page() {
    return <AomiFrame />;
  }


> when apps/registry/src/components/assistant-ui/thread-list.tsx says this: 
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAssistantState,
} from "@assistant-ui/react";
now my repo can resolve these dependencies thanks to correct pnpm configuration, but can the user 
application resolve it? 

⏺ Yes, because we list it in dependencies in the registry.

  Looking at your registry.ts:

  {
    name: "assistant-thread-list",
    file: "components/assistant-ui/thread-list.tsx",
    dependencies: ["@assistant-ui/react", "lucide-react"],  // ← This!
    registryDependencies: [...],
  }

  What happens when user runs shadcn add:

  1. shadcn reads dependencies: ["@assistant-ui/react", "lucide-react"]
  2. Runs npm install @assistant-ui/react lucide-react
  3. Package is now in user's node_modules/
  4. Import resolves ✓

  User's project:
  ├── node_modules/
  │   └── @assistant-ui/react/    ← installed by shadcn
  ├── components/
  │   └── assistant-ui/
  │       └── thread-list.tsx     ← import { ... } from "@assistant-ui/react" ✓

  | Import type            | Resolved via                      |
  |------------------------|-----------------------------------|
  | @assistant-ui/react    | npm (installed from dependencies) |
  | @/components/ui/button | Their components.json aliases     |
  | @aomi-labs/react       | npm (installed from dependencies) |

  So yes — as long as it's in the dependencies array, shadcn will install it for them.