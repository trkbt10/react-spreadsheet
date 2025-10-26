/**
 * @file Vite configuration for GitHub Pages builds
 */

import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  base: "/react-spreadsheet/",
  build: {
    outDir: "dist-pages",
  },
});
