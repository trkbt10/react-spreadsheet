/**
 * @file Abstract syntax tree definitions for parsed formulas.
 */

import type { CellAddress, CellAddressKey, FormulaPrimitiveValue } from "./types";
import { createCellAddressKey } from "./address";

export type LiteralNode = {
  type: "Literal";
  value: FormulaPrimitiveValue;
};

export type ReferenceNode = {
  type: "Reference";
  address: CellAddress;
};

export type RangeNode = {
  type: "Range";
  start: CellAddress;
  end: CellAddress;
};

export type UnaryOperator = "+" | "-";

export type UnaryNode = {
  type: "Unary";
  operator: UnaryOperator;
  argument: FormulaAstNode;
};

export type BinaryOperator = "+" | "-" | "*" | "/" | "^";

export type BinaryNode = {
  type: "Binary";
  operator: BinaryOperator;
  left: FormulaAstNode;
  right: FormulaAstNode;
};

export type FunctionNode = {
  type: "Function";
  name: string;
  arguments: FormulaAstNode[];
};

export type FormulaAstNode = LiteralNode | ReferenceNode | RangeNode | UnaryNode | BinaryNode | FunctionNode;

const expandRangeDependencies = (start: CellAddress, end: CellAddress): Set<CellAddressKey> => {
  if (start.sheetId !== end.sheetId) {
    throw new Error("Cross-sheet ranges are not supported");
  }

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minColumn = Math.min(start.column, end.column);
  const maxColumn = Math.max(start.column, end.column);
  const dependencies = new Set<CellAddressKey>();

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      dependencies.add(createCellAddressKey({ ...start, row, column }));
    }
  }

  return dependencies;
};

export const expandRangeAddresses = (start: CellAddress, end: CellAddress): CellAddress[] => {
  if (start.sheetId !== end.sheetId) {
    throw new Error("Cross-sheet ranges are not supported");
  }

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minColumn = Math.min(start.column, end.column);
  const maxColumn = Math.max(start.column, end.column);
  const addresses: CellAddress[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      addresses.push({
        ...start,
        row,
        column,
      });
    }
  }

  return addresses;
};

export const collectDependencies = (node: FormulaAstNode): Set<CellAddressKey> => {
  if (node.type === "Literal") {
    return new Set();
  }

  if (node.type === "Reference") {
    return new Set([createCellAddressKey(node.address)]);
  }

  if (node.type === "Range") {
    return expandRangeDependencies(node.start, node.end);
  }

  if (node.type === "Unary") {
    return collectDependencies(node.argument);
  }

  if (node.type === "Binary") {
    const leftDependencies = collectDependencies(node.left);
    const rightDependencies = collectDependencies(node.right);
    const merged = new Set(leftDependencies);
    rightDependencies.forEach((dependency) => merged.add(dependency));
    return merged;
  }

  if (node.type === "Function") {
    return node.arguments.reduce((accumulator, argument) => {
      const deps = collectDependencies(argument);
      deps.forEach((dependency) => accumulator.add(dependency));
      return accumulator;
    }, new Set<CellAddressKey>());
  }

  throw new Error("Unknown AST node");
};

export const collectDependencyAddresses = (node: FormulaAstNode): CellAddress[] => {
  if (node.type === "Literal") {
    return [];
  }

  if (node.type === "Reference") {
    return [node.address];
  }

  if (node.type === "Range") {
    return expandRangeAddresses(node.start, node.end);
  }

  if (node.type === "Unary") {
    return collectDependencyAddresses(node.argument);
  }

  if (node.type === "Binary") {
    return [...collectDependencyAddresses(node.left), ...collectDependencyAddresses(node.right)];
  }

  if (node.type === "Function") {
    return node.arguments.flatMap((argument) => collectDependencyAddresses(argument));
  }

  throw new Error("Unknown AST node");
};
