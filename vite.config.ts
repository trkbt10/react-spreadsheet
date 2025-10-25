/**
 * @file Vite build configuration
 */

import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const baseConfig = {
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
    },
  };

  if (command === "build") {
    return {
      ...baseConfig,
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
    };
  }

  return baseConfig;
});
