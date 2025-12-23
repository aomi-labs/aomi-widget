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
  tsconfig: "tsconfig.json",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@assistant-ui/react",
  ],
  esbuildPlugins: [copyStylesPlugin],
});
