import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "esbuild";
import { defineConfig } from "tsup";

const root = __dirname;

const copyStylesPlugin: Plugin = {
  name: "copy-styles",
  setup(build) {
    build.onEnd(() => {
      try {
        const distDir = join(root, "dist");
        mkdirSync(distDir, { recursive: true });
        copyFileSync(join(root, "src/styles.css"), join(distDir, "styles.css"));
        cpSync(join(root, "src/themes"), join(distDir, "themes"), { recursive: true });
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
