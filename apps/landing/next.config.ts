import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stub optional native-only deps pulled in by wallet connectors so builds don't fail.
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
