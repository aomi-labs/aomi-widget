import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import type { Plugin } from "esbuild";
import { defineConfig } from "tsup";

const copyStylesPlugin: Plugin = {
  name: "copy-styles",
  setup(build) {
    build.onEnd(() => {
      try {
        mkdirSync("dist", { recursive: true });
        copyFileSync("src/styles.css", "dist/styles.css");
        cpSync("src/themes", "dist/themes", { recursive: true });
      } catch (error) {
        console.error("Failed to copy theme assets into dist/", error);
        throw error;
      }
    });
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    compilerOptions: {
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  tsconfig: "tsconfig.lib.json",
  external: [
    // React
    "react",
    "react-dom",
    "react/jsx-runtime",
    // Next.js
    "next",
    "next/image",
    // Assistant UI
    "@assistant-ui/react",
    "@assistant-ui/react-ai-sdk",
    "@assistant-ui/react-markdown",
    // Radix UI
    "@radix-ui/react-avatar",
    "@radix-ui/react-dialog",
    "@radix-ui/react-separator",
    "@radix-ui/react-slot",
    "@radix-ui/react-tooltip",
    // Web3
    "@reown/appkit",
    "@reown/appkit/react",
    "@reown/appkit/networks",
    "@reown/appkit-adapter-wagmi",
    "wagmi",
    "viem",
    "@tanstack/react-query",
    // Animation
    "framer-motion",
    "motion",
    "motion/react",
    // Other
    "lucide-react",
    "zustand",
    "remark-gfm",
    "react-shiki",
    // AI
    "@ai-sdk/openai",
    "ai",
  ],
  esbuildPlugins: [copyStylesPlugin],
});
