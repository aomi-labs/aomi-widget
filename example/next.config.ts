import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configure webpack to resolve modules from parent directory
  webpack: (config) => {
    // Add the parent src directory to the module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "../src"),
      "@/src": path.resolve(__dirname, "../src"),
      // Force viem to use its own ox version (0.9.6) which has erc8010
      "ox": path.resolve(__dirname, "node_modules/viem/node_modules/ox"),
    };

    // Ensure modules from parent src directory resolve to example's node_modules
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      "node_modules",
      ...(config.resolve.modules || []),
    ];

    return config;
  },
};

export default nextConfig;
