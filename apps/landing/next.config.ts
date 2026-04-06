import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import path from "node:path";

const withMDX = createMDX();

// Absolute paths for webpack aliases
const landingNodeModules = path.resolve(__dirname, "node_modules");
const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");
const docsSrc = path.resolve(__dirname);
const landingSrc = path.resolve(__dirname, "src");
const registryComponents = path.resolve(__dirname, "../registry/src/components");
const contentDir = path.resolve(__dirname, "content");
const contentExamplesComponents = path.join(
  contentDir,
  "components",
  "examples",
);

// Turbopack resolveAlias needs package specifiers or relative paths, not absolute.
// We point singleton packages to the landing app's copies so registry code
// (compiled via externalDir) shares the same Zustand store singletons.
const turbopackAliases: Record<string, string> = {
  "@/.source": "./.source",
  "@/app": "./app",
  "@/lib": "./lib",
  // Docs-only examples (API consoles, etc.) — must be listed before `@/components`.
  "@/components/examples": "./content/components/examples",
  // Widget + shadcn UI live in the registry package (docs MDX imports @/components/...).
  "@/components": "../registry/src/components",
  // Docs-only interactive components (playground, API consoles) live under content/.
  "@/content": "./content",
  "@/hooks": "./src/hooks",
  "@aomi-labs/react": "../../packages/react/src/index.ts",
  "@getpara/react-core": "./node_modules/@getpara/react-core",
  "@getpara/react-sdk": "./node_modules/@getpara/react-sdk",
  "@getpara/react-sdk-lite": "./node_modules/@getpara/react-sdk-lite",
  "@tanstack/react-query": "./node_modules/@tanstack/react-query",
  // Force a single Zustand version — react-sdk-lite uses Zustand 4, react-core
  // uses Zustand 5. Without this alias, the store created by react-sdk-lite
  // (Zustand 4) can't be properly read by react-core's useStore (Zustand 5),
  // which prevents ParaProviderMin's isReady gate from ever becoming true.
  zustand: "./node_modules/zustand",
  viem: "./node_modules/viem",
  wagmi: "./node_modules/wagmi",
  // Internal SDK modules accessed directly because ParaProviderMin's isReady
  // gate never opens (Zustand 4/5 subscription mismatch in pnpm). We build
  // our own provider chain from the SDK's primitives instead.
  "@para-internal/auth-provider":
    "./node_modules/@getpara/react-sdk-lite/dist/provider/providers/AuthProvider/AuthProvider.js",
  "@para-internal/store":
    "./node_modules/@getpara/react-sdk-lite/dist/provider/stores/useStore.js",
};

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    "@aomi-labs/react",
    "@aomi-labs/widget-lib",
    "@getpara/react-core",
    "@getpara/react-sdk",
  ],
  // Turbopack aliases (Next.js 16 default bundler) — ensures registry code
  // resolves @getpara/*, wagmi, viem to the same physical copies as the
  // landing app, preventing duplicate Zustand store singletons in pnpm.
  turbopack: {
    resolveAlias: turbopackAliases,
  },
  // Webpack aliases (production builds)
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/.source": path.join(docsSrc, ".source"),
      "@/app": path.join(docsSrc, "app"),
      "@/lib": path.join(docsSrc, "lib"),
      "@/components/examples": contentExamplesComponents,
      "@/components": registryComponents,
      "@/content": contentDir,
      "@/hooks": path.join(landingSrc, "hooks"),
      "@aomi-labs/react": path.join(reactPkgSrc, "index.ts"),
      "@getpara/react-core": path.join(
        landingNodeModules,
        "@getpara/react-core",
      ),
      "@getpara/react-sdk": path.join(
        landingNodeModules,
        "@getpara/react-sdk",
      ),
      "@getpara/react-sdk-lite": path.join(
        landingNodeModules,
        "@getpara/react-sdk-lite",
      ),
      "@tanstack/react-query": path.join(
        landingNodeModules,
        "@tanstack/react-query",
      ),
      zustand: path.join(landingNodeModules, "zustand"),
      viem: path.join(landingNodeModules, "viem"),
      wagmi: path.join(landingNodeModules, "wagmi"),
      "@para-internal/auth-provider": path.join(
        landingNodeModules,
        "@getpara/react-sdk-lite/dist/provider/providers/AuthProvider/AuthProvider.js",
      ),
      "@para-internal/store": path.join(
        landingNodeModules,
        "@getpara/react-sdk-lite/dist/provider/stores/useStore.js",
      ),
    };
    return config;
  },
};

export default withMDX(nextConfig);
