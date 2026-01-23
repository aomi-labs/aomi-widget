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
  ],
  webpack: (config) => {
    const registrySrc = path.resolve(__dirname, "../registry/src");
    const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");
    const docsSrc = path.resolve(__dirname);
    const landingSrc = path.resolve(__dirname, "src");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@/.source": path.join(docsSrc, ".source"),
      "@/app": path.join(docsSrc, "app"),
      "@/lib": path.join(docsSrc, "lib"),
      // Registry components/hooks live in apps/registry/src
      "@/components": path.join(registrySrc, "components"),
      "@/hooks": path.join(registrySrc, "hooks"),
      // Landing app-specific imports
      "@landing": landingSrc,
      "@aomi-labs/react": path.join(reactPkgSrc, "index.ts"),
    };
    return config;
  },
};

export default withMDX(nextConfig);
