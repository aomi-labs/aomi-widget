import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import path from "node:path";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@aomi-labs/react", "@aomi-labs/widget-lib"],
  webpack: (config) => {
    // Resolve @/ imports from registry to its src folder
    const registrySrc = path.resolve(__dirname, "../registry/src");
    const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");
    const docsSrc = path.resolve(__dirname);
    const landingSrc = path.resolve(__dirname, "src");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/.source": path.join(docsSrc, ".source"),
      "@/app": path.join(docsSrc, "app"),
      "@/lib": path.join(docsSrc, "lib"),
      // Point to landing app's src/components (app-specific components)
      // Registry components can be imported via @aomi-labs/widget-lib/components/*
      "@/components": path.join(landingSrc, "components"),
      "@/hooks": path.join(landingSrc, "hooks"),
      "@aomi-labs/react": path.join(reactPkgSrc, "index.ts"),
    };
    return config;
  },
};

export default withMDX(nextConfig);
