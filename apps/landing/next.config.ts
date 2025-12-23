import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@aomi-labs/react", "@aomi-labs/registry"],
  // Stub optional native-only deps pulled in by wallet connectors so builds don't fail.
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "@aomi-labs/react": path.resolve(__dirname, "../../packages/react/src"),
      "@aomi-labs/registry": path.resolve(__dirname, "../registry/src"),
      "@aomi-labs/react/styles.css": path.resolve(
        __dirname,
        "../../packages/react/src/styles.css"
      ),
    };
    return config;
  },
};

export default nextConfig;
