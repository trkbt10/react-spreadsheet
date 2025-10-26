/**
 * @file Vite configuration for library builds
 */

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  plugins: [
    dts({
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.spec.ts", "src/**/*.spec.tsx", "src/showcase/**/*"],
      rollupTypes: true,
    }),
  ],
  build: {
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      formats: ["cjs", "es"],
    },
    rollupOptions: {
      external: [/node:.+/],
    },
  },
});
