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
  ],
  webpack: (config) => {
    // Resolve @/ imports from registry to its src folder
    const registrySrc = path.resolve(__dirname, "../registry/src");
    const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");
    const docsSrc = path.resolve(__dirname);
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/.source": path.join(docsSrc, ".source"),
      "@/app": path.join(docsSrc, "app"),
      "@/lib": path.join(docsSrc, "lib"),
      "@/components": path.join(registrySrc, "components"),
      "@/hooks": path.join(registrySrc, "hooks"),
      "@aomi-labs/react": path.join(reactPkgSrc, "index.ts"),
    };
    return config;
  },
};

export default withMDX(nextConfig);
