import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@aomi-labs/widget-lib"],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@aomi-labs/widget-lib": path.resolve(__dirname, "../../src"),
      "@aomi-labs/widget-lib/styles.css": path.resolve(__dirname, "../../src/styles.css"),
    };
    return config;
  },
};

export default nextConfig;
