import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const appNodeModules = path.join(appRoot, "node_modules");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io", "*.trycloudflare.com"],
  experimental: {
    externalDir: true,
  },
  transpilePackages: [
    "@aomi-labs/client",
    "@getpara/evm-wallet-connectors",
    "@getpara/react-sdk",
    "@getpara/react-sdk-lite",
    "@getpara/web-sdk",
  ],
  turbopack: {
    resolveAlias: {
      "@aomi-labs/client": "../../packages/client/src/index.ts",
      "@tanstack/react-query": "./node_modules/@tanstack/react-query",
      viem: "./node_modules/viem",
      wagmi: "./node_modules/wagmi",
      zustand: "./node_modules/zustand",
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
      "@tanstack/react-query": path.join(
        appNodeModules,
        "@tanstack/react-query",
      ),
      viem: path.join(appNodeModules, "viem"),
      wagmi: path.join(appNodeModules, "wagmi"),
      zustand: path.join(appNodeModules, "zustand"),
    };

    return config;
  },
};

export default nextConfig;
