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
    banner: { js: "#!/usr/bin/env node" },
    tsconfig: "tsconfig.json",
  },
]);
