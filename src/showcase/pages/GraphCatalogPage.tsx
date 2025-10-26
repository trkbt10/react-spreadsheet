/**
 * @file Graph Catalog showcase page.
 */

import type { ReactElement } from "react";
import { GraphCatalog } from "../../components/graph/GraphCatalog";
import { useShowcaseMetadata } from "../hooks/useShowcaseMetadata";

export const GraphCatalogPage = (): ReactElement => {
  useShowcaseMetadata({
    title: "Graph Catalog",
    description: "Visualization of various graph types and layouts",
  });

  return <GraphCatalog />;
};
