import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import path from "node:path";
import remarkGfm from "remark-gfm";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    providerImportSource: "@docs/mdx-provider",
  },
});

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  pageExtensions: ["ts", "tsx", "mdx"],
  transpilePackages: ["@aomi-labs/widget-lib"],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "../../src"),
      "@docs": path.resolve(__dirname, "./src"),
      "@aomi-labs/widget-lib": path.resolve(__dirname, "../../src"),
      "@aomi-labs/widget-lib/styles.css": path.resolve(__dirname, "../../src/styles.css"),
    };
    return config;
  },
};

export default withMDX(nextConfig);
