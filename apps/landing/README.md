# Aomi Landing and Widget Documentation

This Next.js app hosts the public site, Fumadocs documentation, and a real
`AomiWidget` consumer. Landing does not mount BetterAuth, account routes, or a
backend proxy; it calls Portal directly with credentialed browser requests.

## Quick Start

```bash
# Install dependencies (automatically runs fumadocs-mdx)
pnpm install

# Start backend + Portal (from the repository root)
./scripts/dev-auth-stack.sh start

# Start Landing on a separate origin
pnpm --filter landing dev -- -p 3001

# Build for production
pnpm build
```

The docs will be available at `http://localhost:3001/docs`. Copy `.env.example`
to `.env.local`; `NEXT_PUBLIC_AOMI_PORTAL_URL` must point at Portal on port 3000. The standard local Landing origins are trusted automatically. For any
other port or production origin, add the exact origin to Portal's
`AOMI_TRUSTED_ORIGINS`.

The landing hero selects Para through `paraAuth()` when
`NEXT_PUBLIC_PARA_API_KEY` is set and safely falls back to providerless
external-wallet/SIWE mode when it is blank. Provider verifier secrets remain on
Portal and must never be added to this app.

## Adding Documentation

### Create a New Page

1. Create a new MDX file in `content/docs/`:

```mdx
---
title: Your Page Title
description: Your page description
---

# Your Page Title

Your content here with full MDX support.
```

2. Add it to `content/docs/meta.json`:

```json
{
  "pages": ["existing-page", "your-new-page"]
}
```

3. The page will automatically be available at `/docs/your-new-page`

### Organizing with Sections

Use separators in `meta.json` for visual grouping:

```json
{
  "pages": ["---Section Title---", "page-1", "page-2"]
}
```

### Nested Pages

Create subdirectories with their own `meta.json`:

```
content/docs/
├── guides/
│   ├── meta.json
│   ├── getting-started.mdx
│   └── advanced.mdx
└── meta.json
```

## MDX Features

### Built-in Components

````mdx
# Callouts

<Callout>This is a callout</Callout>

# Tabs

<Tabs>
  <Tab title="npm">```bash npm install ```</Tab>
  <Tab title="pnpm">```bash pnpm install ```</Tab>
</Tabs>

# Accordions

<Accordions>
  <Accordion title="Question 1">Answer 1</Accordion>
</Accordions>
````

### Code Blocks

Code blocks support syntax highlighting, line numbers, and more:

````mdx
```tsx title="app/page.tsx" {2-4}
export default function Page() {
  // These lines are highlighted
  const [value, setValue] = useState(0);
  return <div>{value}</div>;
}
```
````

### Importing Components

You can import and use React components directly in MDX:

```mdx
import { MyComponent } from "@/components/MyComponent";

<MyComponent />
```

## Configuration

### Fumadocs Config (`source.config.ts`)

Configure MDX processing, code highlighting themes, and plugins:

```ts
export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMermaid],
    rehypeCodeOptions: {
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha",
      },
    },
  },
});
```

### Layout (`app/docs/layout.tsx`)

Customize the docs layout, navigation, and sidebar:

```tsx
<DocsLayout
  tree={source.pageTree}
  sidebar={{
    defaultOpenLevel: 0,
  }}
>
  {children}
</DocsLayout>
```

## How It Works

1. **MDX Files** → `content/docs/` contains all documentation
2. **Build Time** → `fumadocs-mdx` generates `.source/` files
3. **Source Loader** → `lib/source.tsx` loads the generated files
4. **Dynamic Routes** → `app/docs/[[...slug]]/page.tsx` renders any doc page
5. **Navigation** → `meta.json` files define sidebar structure

## File Structure

```
apps/docs/
├── .source/              # Auto-generated, do not edit
├── app/
│   ├── docs/
│   │   ├── [[...slug]]/
│   │   │   └── page.tsx  # Dynamic doc page
│   │   └── layout.tsx    # Docs layout with sidebar
│   └── mdx-components.tsx
├── content/
│   └── docs/
│       ├── meta.json     # Navigation config
│       ├── index.mdx
│       └── *.mdx         # Doc pages
├── lib/
│   └── source.tsx        # Source loader
└── source.config.ts      # Fumadocs config
```

## Learn More

- [Fumadocs Documentation](https://fumadocs.vercel.app/)
- [MDX Documentation](https://mdxjs.com/)
- [Assistant UI Docs](https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs) (reference implementation)
