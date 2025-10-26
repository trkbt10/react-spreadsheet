/**
 * @file Builds the dependency graph for formulas across the spreadsheet workbook.
 */

import type {
  FormulaWorkbookGrid,
  DependencyTree,
  ParsedFormula,
  CellAddress,
  CellAddressKey,
  WorkbookIndex,
} from "./types";
import { createCellAddressKey } from "./address";
import { parseFormula } from "./parser";

const ensureNode = (tree: DependencyTree, address: CellAddress): void => {
  const key = createCellAddressKey(address);
  if (!tree.has(key)) {
    tree.set(key, {
      address,
      dependencies: new Set(),
      dependents: new Set(),
    });
  }
};

const getNode = (tree: DependencyTree, address: CellAddress): CellAddressKey => {
  const key = createCellAddressKey(address);
  ensureNode(tree, address);
  return key;
};

export type BuildDependencyTreeParams = {
  matrix: FormulaWorkbookGrid;
  index: WorkbookIndex;
};

export type BuildDependencyTreeResult = {
  tree: DependencyTree;
  formulas: Map<CellAddressKey, ParsedFormula>;
};

export const buildDependencyTree = ({ matrix, index }: BuildDependencyTreeParams): BuildDependencyTreeResult => {
  const tree: DependencyTree = new Map();
  const formulas = new Map<CellAddressKey, ParsedFormula>();

  matrix.forEach((sheetMatrix) => {
    sheetMatrix.rows.forEach((rowMap, rowIndex) => {
      rowMap.forEach((cell, columnIndex) => {
        const address: CellAddress = {
          sheetId: sheetMatrix.sheetId,
          sheetName: sheetMatrix.sheetName,
          row: rowIndex,
          column: columnIndex,
        };

        const key = getNode(tree, address);

        if (!cell || cell.type !== "formula") {
          const node = tree.get(key);
          if (!node) {
            throw new Error("Failed to create dependency node");
          }
          node.dependencies = new Set();
          return;
        }

        if (typeof cell.formula !== "string" || cell.formula.trim().length === 0) {
          throw new Error(
            `Formula cell at "${sheetMatrix.sheetName}" (${columnIndex}, ${rowIndex}) is missing formula content`,
          );
        }

        const parsed = parseFormula(cell.formula, {
          defaultSheetId: sheetMatrix.sheetId,
          defaultSheetName: sheetMatrix.sheetName,
          workbookIndex: index,
        });

        const node = tree.get(key);
        if (!node) {
          throw new Error("Failed to retrieve dependency node");
        }
        node.dependencies = new Set(parsed.dependencies);

        const parsedFormula: ParsedFormula = {
          address,
          formula: cell.formula,
          ast: parsed.ast,
          dependencies: parsed.dependencies,
          dependencyAddresses: parsed.dependencyAddresses,
        };
        formulas.set(key, parsedFormula);

        parsed.dependencyAddresses.forEach((dependencyAddress) => {
          ensureNode(tree, dependencyAddress);
        });
      });
    });
  });

  formulas.forEach((formulaNode, formulaKey) => {
    formulaNode.dependencies.forEach((dependencyKey) => {
      const dependencyNode = tree.get(dependencyKey);
      if (!dependencyNode) {
        throw new Error(`Dependency "${dependencyKey}" could not be resolved`);
      }
      dependencyNode.dependents.add(formulaKey);
    });
  });

  return {
    tree,
    formulas,
  };
};
