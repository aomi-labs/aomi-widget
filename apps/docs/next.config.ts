import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import path from "node:path";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    "@aomi-labs/react",
    "@aomi-labs/widget-lib",
    "shiki",
  ],
  serverExternalPackages: ["twoslash"],
  webpack: (config) => {
    // Resolve @/ imports from registry to its src folder
    const registrySrc = path.resolve(__dirname, "../registry/src");
    const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/components": path.join(registrySrc, "components"),
      "@/hooks": path.join(registrySrc, "hooks"),
      "@/lib": path.join(registrySrc, "lib"),
      "@aomi-labs/react": path.join(reactPkgSrc, "index.ts"),
    };
    return config;
  },
};

export default withMDX(nextConfig);
