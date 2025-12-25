import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import path from "node:path";
import remarkGfm from "remark-gfm";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    providerImportSource: "@/mdx-provider",
  },
});

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  pageExtensions: ["ts", "tsx", "mdx"],
  transpilePackages: [
    "@aomi-labs/react",
    "@aomi-labs/widget-lib",
  ],
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
