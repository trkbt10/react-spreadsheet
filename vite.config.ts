/**
 * @file Vite build configuration
 */

import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  const baseConfig = {
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
    },
  };

  // Library build (default)
  if (command === "build" && mode !== "pages") {
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

  // GitHub Pages build
  if (command === "build" && mode === "pages") {
    return {
      ...baseConfig,
      base: "/react-spreadsheet/",
      build: {
        outDir: "dist-pages",
      },
    };
  }

  // Dev mode - use Pages configuration for preview
  return baseConfig;
});
