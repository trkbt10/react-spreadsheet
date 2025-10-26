/**
 * @file Bootstraps the React application for browser preview.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { App } from "./App";
import { ShowcaseLayout } from "./ShowcaseLayout";
import { UIComponentsPage } from "./pages/UIComponentsPage";
import { GraphCatalogPage } from "./pages/GraphCatalogPage";
import { DependencyGraphPage } from "./pages/DependencyGraphPage";
import { DependencyGraphVisxPage } from "./pages/DependencyGraphVisxPage";
import { FunctionPreviewPage } from "./pages/FunctionPreviewPage";
import "../global.css";
import "../themes/adobe-light.css";
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/catalog" element={<ShowcaseLayout />}>
          <Route index element={<UIComponentsPage />} />
          <Route path="graph-catalog" element={<GraphCatalogPage />} />
          <Route path="dependency-graph" element={<DependencyGraphPage />} />
          <Route path="dependency-graph-visx" element={<DependencyGraphVisxPage />} />
          <Route path="functions/:category/:functionName" element={<FunctionPreviewPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
