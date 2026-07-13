import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "providers/para": "src/lib/wallet-kit/providers/para/index.ts",
    "providers/privy": "src/lib/wallet-kit/providers/privy/index.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  outDir: "package-dist",
  target: "es2020",
  banner: { js: '"use client";' },
});
