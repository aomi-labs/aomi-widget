import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@aomi-labs/widget-lib", "@aomi-labs/react"],
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
      // Stub optional native-only deps pulled in by wallet connectors
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
