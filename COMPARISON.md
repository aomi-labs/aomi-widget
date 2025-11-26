# Architectural Comparison: Root App vs Example Project

## Overview

| Aspect | Root (`app/`) | Example (`example/`) |
|--------|---------------|----------------------|
| Project Type | Main Next.js app | Inner nested Next.js app |
| Component Source | `./src/*` | `../src/*` (parent's src) |
| Package Manager | npm/pnpm | npm |
| Role | Development/Library host | Consumer/Demo project |

---

## 1. Dependencies

### Root Project (`package.json`)

```json
{
  "@ai-sdk/openai": "^2.0.46",
  "@assistant-ui/react": "^0.11.28",
  "@assistant-ui/react-ai-sdk": "^1.1.5",
  "@assistant-ui/react-markdown": "^0.11.1",
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-tooltip": "^1.2.8",
  "@reown/appkit": "^1.8.14",
  "@reown/appkit-adapter-wagmi": "^1.8.14",
  "@tanstack/react-query": "^5.90.10",
  "ai": "^5.0.65",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "framer-motion": "^12.23.22",
  "lucide-react": "^0.545.0",
  "motion": "^12.23.22",
  "next": "15.5.4",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-shiki": "^0.9.0",
  "remark-gfm": "^4.0.1",
  "tailwind-merge": "^3.3.1",
  "tw-animate-css": "^1.4.0",
  "viem": "^2.40.3",
  "wagmi": "^2.19.5",
  "zustand": "^5.0.8"
}
```

### Example Project (`example/package.json`)

```json
{
  "@assistant-ui/react": "^0.11.28",
  "@assistant-ui/react-markdown": "^0.11.1",
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-tooltip": "^1.2.8",
  "@reown/appkit": "^1.8.14",
  "@reown/appkit-adapter-wagmi": "^1.8.14",
  "@tanstack/react-query": "^5.90.10",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.545.0",
  "motion": "^12.23.22",
  "next": "15.5.4",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "remark-gfm": "^4.0.1",
  "tailwind-merge": "^3.3.1",
  "tailwindcss": "^4.1.17",
  "tw-animate-css": "^1.4.0",
  "viem": "2.40.3",
  "wagmi": "^2.19.4",
  "zustand": "^5.0.8"
}
```

### Key Dependency Differences

| Package | Root | Example | Impact |
|---------|------|---------|--------|
| `@ai-sdk/openai` | `^2.0.46` | **MISSING** | AI SDK not available |
| `@assistant-ui/react-ai-sdk` | `^1.1.5` | **MISSING** | AI SDK integration missing |
| `ai` | `^5.0.65` | **MISSING** | Vercel AI SDK missing |
| `framer-motion` | `^12.23.22` | **MISSING** | Animation library missing |
| `react-shiki` | `^0.9.0` | **MISSING** | Syntax highlighting missing |
| `viem` | `^2.40.3` | `2.40.3` (pinned) | Version pinning difference |
| `wagmi` | `^2.19.5` | `^2.19.4` | Minor version difference |
| `tailwindcss` | devDependencies | dependencies | Build vs runtime |

### Example-Specific Additions

| Package | Version | Purpose |
|---------|---------|---------|
| npm overrides for `@noble/*` | Various | Fix crypto lib conflicts |

---

## 2. Components Included

### Shared Components (from `../src/`)

Both projects use the same shared component library located at `/src/`:

#### Core UI Components (`src/components/ui/`)
- `avatar.tsx`
- `badge.tsx`
- `breadcrumb.tsx`
- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `input.tsx`
- `label.tsx`
- `separator.tsx`
- `sheet.tsx`
- `sidebar.tsx`
- `skeleton.tsx`
- `tooltip.tsx`

#### Assistant UI Components (`src/components/assistant-ui/`)
- `attachment.tsx`
- `markdown-text.tsx`
- `runtime.tsx`
- `runtime.backup.tsx`
- `thread.tsx`
- `thread-list.tsx`
- `threadlist-sidebar.tsx`
- `tool-fallback.tsx`
- `tooltip-icon-button.tsx`

#### Feature Components
- `aomi-frame.tsx` - Main chat frame component
- `wallet-providers.tsx` - Wallet context provider

#### Tools
- `tools/example-tool/ExampleTool.tsx`

#### Test Components
- `test/ThreadContextTest.tsx`

### Path Resolution Difference

| Project | tsconfig `paths` | Resolves to |
|---------|------------------|-------------|
| Root | `@/*: ["./src/*"]` | `/src/*` |
| Example | `@/*: ["../src/*"]` | `/src/*` (parent) |

---

## 3. Styles and Style Loading Path

### Global CSS (`globals.css`)

**Both files are IDENTICAL** with the same:
- Tailwind imports
- tw-animate-css
- Theme variables (light/dark mode)
- AppKit CSS overrides

### Style Loading Chain

#### Root Project
```
app/layout.tsx
  └── import "./globals.css"
        └── app/globals.css
              └── @import "tailwindcss"
              └── @import "tw-animate-css"
```

#### Example Project
```
example/app/layout.tsx
  └── import "./globals.css"
        └── example/app/globals.css
              └── @import "tailwindcss"
              └── @import "tw-animate-css"
```

### Critical Style Difference in page.tsx

| File | Background Class |
|------|------------------|
| `app/page.tsx` | `bg-black` |
| `example/app/page.tsx` | `bg-white` |

```tsx
// Root: app/page.tsx
<main className="flex min-h-screen items-center justify-center bg-black p-6">

// Example: example/app/page.tsx
<main className="bg-white flex min-h-screen items-center justify-center p-6">
```

---

## 4. Potential Causes of Visual Differences

### 4.1 Background Color Mismatch
**Impact: HIGH**

The root app uses `bg-black` while example uses `bg-white`. This creates an immediate visual contrast difference.

### 4.2 Missing Animation Library
**Impact: MEDIUM**

Root has `framer-motion` for animations. Example only has `motion` but NOT `framer-motion`. Some animation features may not work or look different.

### 4.3 Missing Syntax Highlighting
**Impact: LOW-MEDIUM**

`react-shiki` is missing in example. Code blocks in markdown may render without syntax highlighting.

### 4.4 Missing AI SDK Packages
**Impact: FUNCTIONAL**

Example is missing:
- `@ai-sdk/openai`
- `@assistant-ui/react-ai-sdk`
- `ai`

This could cause runtime errors if any components depend on these for AI functionality.

### 4.5 Static Assets Difference
**Impact: MEDIUM**

| Asset Type | Root `/public/assets/` | Example `/example/public/assets/` |
|------------|------------------------|-----------------------------------|
| Fonts | **MISSING** | Has Bauhaus & iA Writer fonts |
| Images | Has all images | Has all images |

The root project is **missing the fonts folder**. If any component uses custom fonts from `/assets/fonts/`, they won't load in the root app.

### 4.6 Webpack Configuration
**Impact: MEDIUM**

Example has custom webpack config in `next.config.ts`:
```typescript
// Forces ox module resolution to fix viem compatibility
"ox": path.resolve(__dirname, "node_modules/viem/node_modules/ox")
```

Root has no webpack customization. This could cause module resolution differences.

### 4.7 Package Manager Resolution
**Impact: MEDIUM**

- Root: Has both `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm)
- Example: Uses npm with overrides

pnpm and npm resolve peer dependencies differently, which can cause version conflicts especially in the wagmi/viem/reown ecosystem.

### 4.8 TailwindCSS Location
**Impact: LOW**

- Root: `tailwindcss` in devDependencies
- Example: `tailwindcss` in dependencies

This shouldn't affect runtime but indicates different setup intentions.

---

## Summary of Required Fixes

### To Make Example Match Root:

1. **Change background color** in `example/app/page.tsx`:
   ```tsx
   className="flex min-h-screen items-center justify-center bg-black p-6"
   ```

2. **Add missing dependencies**:
   ```bash
   npm install @ai-sdk/openai @assistant-ui/react-ai-sdk ai framer-motion react-shiki
   ```

3. **Remove fonts from example** (or add to root) for consistency

### To Make Root Match Example:

1. **Copy fonts folder** to `public/assets/fonts/`

2. **Add webpack config** if ox module issues occur

---

## Architecture Diagram

```
npm-lib-2/
├── app/                    # Root Next.js app
│   ├── layout.tsx          # imports ./globals.css, @/components/wallet-providers
│   ├── page.tsx            # bg-black, imports ../src/components/aomi-frame
│   └── globals.css         # Full theme + AppKit overrides
│
├── src/                    # SHARED COMPONENT LIBRARY
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── assistant-ui/   # Chat components
│   │   └── ...
│   └── lib/
│       ├── utils.ts
│       └── thread-context.tsx
│
├── example/                # Inner Next.js project (consumer)
│   ├── app/
│   │   ├── layout.tsx      # imports ./globals.css, @/components/wallet-providers
│   │   ├── page.tsx        # bg-white, imports @/components/aomi-frame
│   │   └── globals.css     # Full theme + AppKit overrides
│   ├── public/assets/
│   │   ├── fonts/          # Custom fonts (NOT in root)
│   │   └── images/
│   ├── next.config.ts      # Custom webpack for @/* -> ../src/*
│   ├── tsconfig.json       # paths: @/* -> ../src/*
│   └── package.json        # Own dependencies + overrides
│
├── public/assets/
│   └── images/             # NO fonts folder
│
├── package.json            # Root dependencies
├── tsconfig.json           # paths: @/* -> ./src/*
└── next.config.ts          # Minimal config
```
