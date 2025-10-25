/**
 * @file Bootstraps the React application for browser preview.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./App";
import { Catalog } from "./Catalog";
import { DependencyGraphShowcase } from "./showcase/DependencyGraphShowcase";
import "./global.css";
import "./themes/adobe-light.css";
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/catalog/dependency-graph" element={<DependencyGraphShowcase />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
