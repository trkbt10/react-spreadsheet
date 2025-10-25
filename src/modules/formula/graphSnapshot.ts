/**
 * @file Utilities for generating dependency graph snapshots for visualisation and testing.
 */

import type { SpreadSheet } from "../../types";
import { buildWorkbookMatrix } from "./matrix";
import { buildDependencyTree } from "./dependencyTree";
import { buildDependencyComponents } from "./components";
import type {
  CellAddressKey,
  DependencyComponent,
  DependencyTree,
  FormulaCellData,
} from "./types";
import { createCellAddressKey, indexToColumnLabel } from "./address";

export type DependencyGraphNode = {
  key: CellAddressKey;
  sheetId: string;
  sheetName: string;
  column: number;
  row: number;
  label: string;
  cellType: FormulaCellData["type"] | "virtual";
  isFormula: boolean;
  dependencies: CellAddressKey[];
  dependents: CellAddressKey[];
  componentId: string;
};

export type DependencyGraphComponent = {
  id: string;
  nodes: CellAddressKey[];
  size: number;
  externalDependencies: CellAddressKey[];
};

export type DependencyGraphSnapshot = {
  nodes: DependencyGraphNode[];
  components: DependencyGraphComponent[];
};

const buildCellLookup = (
  matrix: ReturnType<typeof buildWorkbookMatrix>["matrix"],
): Map<CellAddressKey, FormulaCellData | null> => {
  const lookup = new Map<CellAddressKey, FormulaCellData | null>();

  matrix.forEach((sheet) => {
    sheet.rows.forEach((rowMap, rowIndex) => {
      rowMap.forEach((cell, columnIndex) => {
        const key = createCellAddressKey({
          sheetId: sheet.sheetId,
          sheetName: sheet.sheetName,
          column: columnIndex,
          row: rowIndex,
        });
        lookup.set(key, cell);
      });
    });
  });

  return lookup;
};

const createNodeLabel = (sheetName: string, column: number, row: number): string => {
  const columnLabel = indexToColumnLabel(column);
  const rowLabel = (row + 1).toString(10);
  return `${sheetName}!${columnLabel}${rowLabel}`;
};

const mapNodes = (
  tree: DependencyTree,
  components: Map<string, DependencyComponent>,
  componentIndex: Map<CellAddressKey, string>,
  lookup: Map<CellAddressKey, FormulaCellData | null>,
): DependencyGraphNode[] => {
  const nodes: DependencyGraphNode[] = [];

  tree.forEach((node, key) => {
    const cellData = lookup.get(key) ?? null;
    const componentId = componentIndex.get(key) ?? key;

    nodes.push({
      key,
      sheetId: node.address.sheetId,
      sheetName: node.address.sheetName,
      column: node.address.column,
      row: node.address.row,
      label: createNodeLabel(node.address.sheetName, node.address.column, node.address.row),
      cellType: cellData?.type ?? "virtual",
      isFormula: cellData?.type === "formula",
      dependencies: Array.from(node.dependencies).sort(),
      dependents: Array.from(node.dependents).sort(),
      componentId,
    });
  });

  return nodes.sort((a, b) => a.label.localeCompare(b.label));
};

const mapComponents = (components: Map<string, DependencyComponent>): DependencyGraphComponent[] => {
  return Array.from(components.values())
    .map((component) => ({
      id: component.id,
      nodes: Array.from(component.nodes).sort(),
      size: component.nodes.size,
      externalDependencies: Array.from(component.externalDependencies).sort(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const createDependencyGraphSnapshot = (spreadsheet: SpreadSheet): DependencyGraphSnapshot => {
  const { matrix, index } = buildWorkbookMatrix(spreadsheet);
  const lookup = buildCellLookup(matrix);
  const { tree, formulas } = buildDependencyTree({ matrix, index });
  const { components, componentIndex } = buildDependencyComponents(tree);

  // Ensure formulas are materialised in the lookup (dependency tree may include derived entries).
  formulas.forEach((formula, key) => {
    if (!lookup.has(key)) {
      lookup.set(key, {
        type: "formula",
        value: null,
        formula: formula.formula,
      });
    }
  });

  const nodes = mapNodes(tree, components, componentIndex, lookup);
  const componentList = mapComponents(components);

  return {
    nodes,
    components: componentList,
  };
};
