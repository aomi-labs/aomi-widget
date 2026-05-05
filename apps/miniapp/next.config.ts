import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const miniappNodeModules = path.join(appRoot, "node_modules");
const widgetSrc = path.join(workspaceRoot, "apps/registry/src");
const reactPkgSrc = path.join(workspaceRoot, "packages/react/src");
const clientPkgSrc = path.join(workspaceRoot, "packages/client/src");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: workspaceRoot,
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    "@aomi-labs/client",
    "@aomi-labs/react",
    "@aomi-labs/widget-lib",
  ],
  turbopack: {
    resolveAlias: {
      "@/components": "../../apps/registry/src/components",
      "@/hooks": "../../apps/registry/src/hooks",
      "@/lib": "../../apps/registry/src/lib",
      "@aomi-labs/client": "../../packages/client/src/index.ts",
      "@aomi-labs/react": "../../packages/react/src/index.ts",
      "@aomi-labs/widget-lib": "../../apps/registry/src/index.ts",
      "@tanstack/react-query": "./node_modules/@tanstack/react-query",
      zustand: "./node_modules/zustand",
      viem: "./node_modules/viem",
      wagmi: "./node_modules/wagmi",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/components": path.join(widgetSrc, "components"),
      "@/lib": path.join(widgetSrc, "lib"),
      "@/hooks": path.join(widgetSrc, "hooks"),
      "@aomi-labs/client": path.join(clientPkgSrc, "index.ts"),
      "@aomi-labs/react": path.join(reactPkgSrc, "index.ts"),
      "@aomi-labs/widget-lib": path.join(widgetSrc, "index.ts"),
      "@tanstack/react-query": path.join(
        miniappNodeModules,
        "@tanstack/react-query",
      ),
      zustand: path.join(miniappNodeModules, "zustand"),
      viem: path.join(miniappNodeModules, "viem"),
      wagmi: path.join(miniappNodeModules, "wagmi"),
    };
    return config;
  },
};

export default nextConfig;
