import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const appNodeModules = path.join(appRoot, "node_modules");

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@aomi-labs/client"],
  turbopack: {
    resolveAlias: {
      "@aomi-labs/client": "../../packages/client/src/index.ts",
      "@getpara/core-sdk": "./node_modules/@getpara/core-sdk",
      "@getpara/user-management-client":
        "./node_modules/@getpara/user-management-client",
      "@getpara/web-sdk": "./node_modules/@getpara/web-sdk",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@aomi-labs/client": path.join(
        workspaceRoot,
        "packages/client/src/index.ts",
      ),
      "@getpara/core-sdk": path.join(appNodeModules, "@getpara/core-sdk"),
      "@getpara/user-management-client": path.join(
        appNodeModules,
        "@getpara/user-management-client",
      ),
      "@getpara/web-sdk": path.join(appNodeModules, "@getpara/web-sdk"),
    };
    return config;
  },
};

export default nextConfig;
