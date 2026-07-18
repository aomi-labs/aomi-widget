import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    outDir: "dist",
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
  },
  {
    entry: ["src/cli.tsx"],
    outDir: "dist",
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    // Smithers persists runs via bun:sqlite, so the CLI prefers Bun.
    banner: { js: "#!/usr/bin/env bun" },
    tsconfig: "tsconfig.json",
  },
]);
