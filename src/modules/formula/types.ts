/**
 * @file Shared types for the formula evaluation module.
 */

import type { Cell } from "../../types";
import type { FormulaAstNode } from "./ast";

export type FormulaPrimitiveValue = string | number | boolean | null;

export type FormulaCellData = {
  type: Cell["type"];
  value: Cell["value"];
  formula?: string;
};

export type FormulaSheetGrid = {
  sheetId: string;
  sheetName: string;
  rows: Map<number, Map<number, FormulaCellData>>;
  maxColumn: number;
  maxRow: number;
};

export type FormulaWorkbookGrid = ReadonlyArray<FormulaSheetGrid>;

export type CellCoordinate = {
  column: number;
  row: number;
};

export type CellAddress = CellCoordinate & {
  sheetId: string;
  sheetName: string;
};

export type CellAddressKey = `${string}|${number}:${number}`;

export type DependencyNode = {
  address: CellAddress;
  dependencies: Set<CellAddressKey>;
  dependents: Set<CellAddressKey>;
};

export type DependencyTree = Map<CellAddressKey, DependencyNode>;

export type FormulaEvaluationResult = FormulaPrimitiveValue;

export type FormulaEngineCellSnapshot = {
  address: CellAddress;
  value: FormulaEvaluationResult;
  dependencies: ReadonlyArray<CellAddressKey>;
};

export type WorkbookSheetIndex = {
  id: string;
  name: string;
  index: number;
};

export type WorkbookIndex = {
  byId: Map<string, WorkbookSheetIndex>;
  byName: Map<string, WorkbookSheetIndex>;
};

export type ParsedFormula = {
  address: CellAddress;
  formula: string;
  ast: FormulaAstNode;
  dependencies: Set<CellAddressKey>;
  dependencyAddresses: CellAddress[];
};

export type DependencyComponent = {
  id: string;
  nodes: Set<CellAddressKey>;
  topologicalOrder: CellAddressKey[];
  externalDependencies: Set<CellAddressKey>;
};

export type DependencyComponentIndex = Map<CellAddressKey, DependencyComponent["id"]>;
