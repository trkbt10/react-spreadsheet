/**
 * @file Formula evaluation engine with dependency-aware memoization.
 */

import type { SpreadSheet } from "../../types";
import { createCellAddressKey, parseCellReference } from "./address";
import type {
  CellAddress,
  CellAddressKey,
  DependencyTree,
  FormulaCellData,
  FormulaEvaluationResult,
  FormulaWorkbookMatrix,
  ParsedFormula,
  WorkbookIndex,
} from "./types";
import { buildWorkbookMatrix } from "./matrix";
import { buildDependencyTree } from "./dependencyTree";
import type { BuildDependencyTreeResult } from "./dependencyTree";
import type { FormulaAstNode } from "./ast";
import type { ParseCellReferenceDependencies } from "./address";
import { parseFormula } from "./parser";

type CellState = {
  value: FormulaEvaluationResult;
  version: number;
  dependenciesVersion: Map<CellAddressKey, number>;
  dirty: boolean;
};

type SheetInfo = {
  sheetId: string;
  sheetName: string;
  rows: number;
  columns: number;
};

type EvalResult = FormulaEvaluationResult | FormulaEvaluationResult[];

const createInitialState = (): CellState => ({
  value: null,
  version: 0,
  dependenciesVersion: new Map(),
  dirty: true,
});

const toPrimitive = (value: FormulaCellData["value"]): FormulaEvaluationResult => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  throw new Error("Unsupported primitive value in cell");
};

const isArrayResult = (value: EvalResult): value is FormulaEvaluationResult[] => Array.isArray(value);

const flattenValues = (values: EvalResult[]): FormulaEvaluationResult[] => {
  return values.flatMap((value) => (isArrayResult(value) ? value : [value]));
};

const coerceScalar = (result: EvalResult, description: string): FormulaEvaluationResult => {
  if (isArrayResult(result)) {
    if (result.length === 1) {
      return result[0] ?? null;
    }
    throw new Error(`Range cannot be coerced to scalar for ${description}`);
  }
  return result;
};

const requireNumber = (result: EvalResult, description: string): number => {
  const scalar = coerceScalar(result, description);
  if (typeof scalar !== "number" || Number.isNaN(scalar)) {
    throw new Error(`Expected number for ${description}`);
  }
  return scalar;
};

const requireBoolean = (result: EvalResult, description: string): boolean => {
  const scalar = coerceScalar(result, description);
  if (typeof scalar !== "boolean") {
    throw new Error(`Expected boolean for ${description}`);
  }
  return scalar;
};

const ensureComparable = (value: FormulaEvaluationResult, comparator: string): string | number | boolean | null => {
  if (value === null) {
    return value;
  }

  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  throw new Error(`Unsupported comparator operand for ${comparator}`);
};

const comparatorFns: Record<string, (left: EvalResult, right: EvalResult) => boolean> = {
  "=": (left, right) => {
    const leftValue = coerceScalar(left, "comparator");
    const rightValue = coerceScalar(right, "comparator");
    return Object.is(leftValue, rightValue);
  },
  "<>": (left, right) => {
    const leftValue = coerceScalar(left, "comparator");
    const rightValue = coerceScalar(right, "comparator");
    return !Object.is(leftValue, rightValue);
  },
  ">": (left, right) => {
    const leftValue = ensureComparable(coerceScalar(left, "comparator >"), ">");
    const rightValue = ensureComparable(coerceScalar(right, "comparator >"), ">");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '>'");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '>'");
    }
    return (leftValue as number | string) > (rightValue as number | string);
  },
  "<": (left, right) => {
    const leftValue = ensureComparable(coerceScalar(left, "comparator <"), "<");
    const rightValue = ensureComparable(coerceScalar(right, "comparator <"), "<");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '<'");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '<'");
    }
    return (leftValue as number | string) < (rightValue as number | string);
  },
  ">=": (left, right) => {
    const leftValue = ensureComparable(coerceScalar(left, "comparator >="), ">=");
    const rightValue = ensureComparable(coerceScalar(right, "comparator >="), ">=");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '>='");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '>='");
    }
    return (leftValue as number | string) >= (rightValue as number | string);
  },
  "<=": (left, right) => {
    const leftValue = ensureComparable(coerceScalar(left, "comparator <="), "<=");
    const rightValue = ensureComparable(coerceScalar(right, "comparator <="), "<=");
    if (leftValue === null || rightValue === null) {
      throw new Error("Cannot compare null values with '<='");
    }
    if (typeof leftValue !== typeof rightValue) {
      throw new Error("Comparator operands must share the same type");
    }
    if (typeof leftValue === "boolean") {
      throw new Error("Boolean comparison is not supported for '<='");
    }
    return (leftValue as number | string) <= (rightValue as number | string);
  },
};

type FunctionEvaluator = (args: EvalResult[]) => FormulaEvaluationResult;

const createFunctionEvaluators = (): Record<string, FunctionEvaluator> => ({
  SUM: (args) => {
    const values = flattenValues(args);
    return values.reduce<number>((total, value) => {
      if (value === null) {
        return total;
      }
      if (typeof value !== "number") {
        throw new Error("SUM expects numeric arguments");
      }
      return total + value;
    }, 0);
  },
  AVERAGE: (args) => {
    const values = flattenValues(args).filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      throw new Error("AVERAGE expects at least one numeric argument");
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  },
  MAX: (args) => {
    const values = flattenValues(args).filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      throw new Error("MAX expects at least one numeric argument");
    }
    return Math.max(...values);
  },
  MIN: (args) => {
    const values = flattenValues(args).filter((value): value is number => typeof value === "number");
    if (values.length === 0) {
      throw new Error("MIN expects at least one numeric argument");
    }
    return Math.min(...values);
  },
  COUNT: (args) => {
    const values = flattenValues(args);
    return values.reduce<number>((count, value) => (typeof value === "number" ? count + 1 : count), 0);
  },
});

const functionEvaluators = createFunctionEvaluators();

const isComparatorFunction = (name: string): boolean => name.startsWith("COMPARE_");

type EvaluationContext = {
  evaluateCellState: (key: CellAddressKey, stack: Set<CellAddressKey>) => CellState;
  dependencyVersions: Map<CellAddressKey, number>;
};

export class FormulaEngine {
  private readonly workbookIndex: WorkbookIndex;
  private dependencyTree: DependencyTree;
  private formulas: Map<CellAddressKey, ParsedFormula>;
  private readonly cells: Map<CellAddressKey, FormulaCellData | null>;
  private readonly states: Map<CellAddressKey, CellState>;
  private readonly sheetInfo: Map<string, SheetInfo>;

  private constructor(
    workbookIndex: WorkbookIndex,
    treeResult: BuildDependencyTreeResult,
    matrix: FormulaWorkbookMatrix,
  ) {
    this.workbookIndex = workbookIndex;
    this.dependencyTree = treeResult.tree;
    this.formulas = treeResult.formulas;
    this.cells = new Map();
    this.states = new Map();
    this.sheetInfo = new Map();

    matrix.forEach((sheetMatrix) => {
      const rowCount = sheetMatrix.rows.length;
      const columnCount = rowCount === 0 ? 0 : sheetMatrix.rows[0]?.length ?? 0;
      this.sheetInfo.set(sheetMatrix.sheetId, {
        sheetId: sheetMatrix.sheetId,
        sheetName: sheetMatrix.sheetName,
        rows: rowCount,
        columns: columnCount,
      });

      sheetMatrix.rows.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
          const address: CellAddress = {
            sheetId: sheetMatrix.sheetId,
            sheetName: sheetMatrix.sheetName,
            row: rowIndex,
            column: columnIndex,
          };
          const key = createCellAddressKey(address);
          this.cells.set(key, cell ?? null);
          this.states.set(key, createInitialState());
        });
      });
    });

    // Ensure every node in the dependency tree has a corresponding cell state.
    this.dependencyTree.forEach((node, key) => {
      if (!this.cells.has(key)) {
        this.cells.set(key, null);
        this.states.set(key, createInitialState());
      }
    });
  }

  static fromSpreadsheet(spreadsheet: SpreadSheet): FormulaEngine {
    const { matrix, index } = buildWorkbookMatrix(spreadsheet);
    const treeResult = buildDependencyTree({ matrix, index });
    return new FormulaEngine(index, treeResult, matrix);
  }

  private ensureState(key: CellAddressKey): CellState {
    const existing = this.states.get(key);
    if (existing) {
      return existing;
    }
    const state = createInitialState();
    this.states.set(key, state);
    return state;
  }

  private haveDependenciesChanged(state: CellState): boolean {
    for (const [dependencyKey, recordedVersion] of state.dependenciesVersion.entries()) {
      const dependencyState = this.states.get(dependencyKey);
      if (!dependencyState) {
        return true;
      }
      if (dependencyState.version !== recordedVersion) {
        return true;
      }
    }
    return false;
  }

  private evaluateNode(
    node: FormulaAstNode,
    stack: Set<CellAddressKey>,
    context: EvaluationContext,
  ): EvalResult {
    if (node.type === "Literal") {
      return node.value;
    }

    if (node.type === "Reference") {
      const key = createCellAddressKey(node.address);
      const dependencyState = context.evaluateCellState(key, stack);
      context.dependencyVersions.set(key, dependencyState.version);
      return dependencyState.value;
    }

    if (node.type === "Range") {
      return this.evaluateRange(node.start, node.end, stack, context);
    }

    if (node.type === "Unary") {
      const value = this.evaluateNode(node.argument, stack, context);
      if (node.operator === "+") {
        return requireNumber(value, "unary plus");
      }
      return -requireNumber(value, "unary minus");
    }

    if (node.type === "Binary") {
      const { operator } = node;
      const left = this.evaluateNode(node.left, stack, context);
      const right = this.evaluateNode(node.right, stack, context);
      const leftNumber = requireNumber(left, `binary ${operator}`);
      const rightNumber = requireNumber(right, `binary ${operator}`);

      switch (operator) {
        case "+":
          return leftNumber + rightNumber;
        case "-":
          return leftNumber - rightNumber;
        case "*":
          return leftNumber * rightNumber;
        case "/":
          if (rightNumber === 0) {
            throw new Error("Division by zero");
          }
          return leftNumber / rightNumber;
        case "^":
          return leftNumber ** rightNumber;
        default:
          throw new Error(`Unsupported binary operator "${operator}"`);
      }
    }

    if (node.type === "Function") {
      if (node.name === "IF") {
        if (node.arguments.length < 2 || node.arguments.length > 3) {
          throw new Error("IF requires two or three arguments");
        }
        const condition = this.evaluateNode(node.arguments[0], stack, context);
        const conditionValue = requireBoolean(condition, "IF condition");
        if (conditionValue) {
          return this.evaluateNode(node.arguments[1], stack, context);
        }
        if (node.arguments.length === 3) {
          return this.evaluateNode(node.arguments[2], stack, context);
        }
        return null;
      }

      const evaluatedArgs = node.arguments.map((argument) => this.evaluateNode(argument, stack, context));

      if (isComparatorFunction(node.name)) {
        const comparator = node.name.slice("COMPARE_".length);
        const comparatorFn = comparatorFns[comparator];
        if (!comparatorFn) {
          throw new Error(`Unsupported comparator "${node.name}"`);
        }
        if (evaluatedArgs.length !== 2) {
          throw new Error("Comparators require exactly two arguments");
        }
        return comparatorFn(evaluatedArgs[0], evaluatedArgs[1]);
      }

      const evaluator = functionEvaluators[node.name];
      if (!evaluator) {
        throw new Error(`Unknown function "${node.name}"`);
      }
      return evaluator(evaluatedArgs);
    }

    throw new Error("Unsupported formula node");
  }

  private evaluateRange(
    start: CellAddress,
    end: CellAddress,
    stack: Set<CellAddressKey>,
    context: EvaluationContext,
  ): FormulaEvaluationResult[] {
    if (start.sheetId !== end.sheetId) {
      throw new Error("Cross-sheet ranges are not supported");
    }
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minColumn = Math.min(start.column, end.column);
    const maxColumn = Math.max(start.column, end.column);
    const values: FormulaEvaluationResult[] = [];

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const key = createCellAddressKey({
          sheetId: start.sheetId,
          sheetName: start.sheetName,
          row,
          column,
        });
        const dependencyState = context.evaluateCellState(key, stack);
        context.dependencyVersions.set(key, dependencyState.version);
        values.push(dependencyState.value);
      }
    }

    return values;
  }

  private evaluateCellState(key: CellAddressKey, stack: Set<CellAddressKey>): CellState {
    const state = this.ensureState(key);

    if (!state.dirty && !this.haveDependenciesChanged(state)) {
      return state;
    }

    if (stack.has(key)) {
      throw new Error("Circular dependency detected");
    }

    stack.add(key);
    const cell = this.cells.get(key);
    const dependencyVersions = new Map<CellAddressKey, number>();
    const context: EvaluationContext = {
      evaluateCellState: (dependencyKey, dependencyStack) => this.evaluateCellState(dependencyKey, dependencyStack),
      dependencyVersions,
    };

    let newValue: FormulaEvaluationResult;

    if (!cell) {
      newValue = null;
    } else if (cell.type === "formula") {
      const parsed = this.formulas.get(key);
      if (!parsed) {
        throw new Error("Formula definition missing for cell");
      }
      const result = this.evaluateNode(parsed.ast, stack, context);
      if (isArrayResult(result)) {
        throw new Error("Formula cannot resolve directly to a range");
      }
      newValue = result;
    } else {
      newValue = toPrimitive(cell.value);
    }

    const valueChanged = !Object.is(state.value, newValue);
    state.value = newValue;
    state.dependenciesVersion = dependencyVersions;
    state.dirty = false;
    state.version = valueChanged ? state.version + 1 : state.version;

    stack.delete(key);
    return state;
  }

  resolveCellValue(address: CellAddress): FormulaEvaluationResult {
    const key = createCellAddressKey(address);
    return this.evaluateCellState(key, new Set()).value;
  }

  resolveCellValueByCoords(sheetId: string, column: number, row: number): FormulaEvaluationResult {
    const info = this.sheetInfo.get(sheetId);
    if (!info) {
      throw new Error(`Unknown sheet id "${sheetId}"`);
    }
    const address: CellAddress = {
      sheetId,
      sheetName: info.sheetName,
      column,
      row,
    };
    return this.resolveCellValue(address);
  }

  resolveCellValueByLabel(sheetId: string, cellLabel: string): FormulaEvaluationResult {
    const info = this.sheetInfo.get(sheetId);
    if (!info) {
      throw new Error(`Unknown sheet id "${sheetId}"`);
    }
    const coordinate = parseCellReference(cellLabel, {
      defaultSheetId: sheetId,
      defaultSheetName: info.sheetName,
      workbookIndex: this.workbookIndex,
    });
    return this.resolveCellValue(coordinate);
  }

  getSheetValues(sheetId: string): FormulaEvaluationResult[][] {
    const info = this.sheetInfo.get(sheetId);
    if (!info) {
      throw new Error(`Unknown sheet id "${sheetId}"`);
    }

    const values: FormulaEvaluationResult[][] = [];

    for (let row = 0; row < info.rows; row += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let column = 0; column < info.columns; column += 1) {
        rowValues.push(this.resolveCellValueByCoords(sheetId, column, row));
      }
      values.push(rowValues);
    }

    return values;
  }

  private markDirty(key: CellAddressKey, visited: Set<CellAddressKey>): void {
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    const state = this.states.get(key);
    if (state) {
      state.dirty = true;
    }
    const node = this.dependencyTree.get(key);
    if (!node) {
      return;
    }
    node.dependents.forEach((dependentKey) => this.markDirty(dependentKey, visited));
  }

  private updateDependenciesForFormula(key: CellAddressKey, parsed: ParsedFormula): void {
    const node = this.dependencyTree.get(key);
    if (!node) {
      throw new Error("Dependency node missing for formula update");
    }

    node.dependencies.forEach((dependencyKey) => {
      const dependencyNode = this.dependencyTree.get(dependencyKey);
      dependencyNode?.dependents.delete(key);
    });

    node.dependencies = new Set(parsed.dependencies);
    parsed.dependencies.forEach((dependencyKey) => {
      const dependencyNode = this.dependencyTree.get(dependencyKey);
      if (!dependencyNode) {
        throw new Error(`Dependency node "${dependencyKey}" missing`);
      }
      dependencyNode.dependents.add(key);
    });
  }

  private ensureAddress(address: CellAddress): CellAddress {
    const info = this.sheetInfo.get(address.sheetId);
    if (!info) {
      this.sheetInfo.set(address.sheetId, {
        sheetId: address.sheetId,
        sheetName: address.sheetName,
        rows: Math.max(address.row + 1, 0),
        columns: Math.max(address.column + 1, 0),
      });
      return address;
    }

    if (address.sheetName !== info.sheetName) {
      return {
        ...address,
        sheetName: info.sheetName,
      };
    }

    return address;
  }

  updateCell(address: CellAddress, cell: FormulaCellData | null): void {
    const normalizedAddress = this.ensureAddress(address);
    const key = createCellAddressKey(normalizedAddress);
    const visited = new Set<CellAddressKey>();

    this.cells.set(key, cell);
    const existingState = this.states.get(key);
    if (existingState) {
      existingState.dirty = true;
    } else {
      this.states.set(key, createInitialState());
    }

    if (!this.dependencyTree.has(key)) {
      this.dependencyTree.set(key, {
        address: normalizedAddress,
        dependencies: new Set(),
        dependents: new Set(),
      });
    }

    if (!cell || cell.type !== "formula") {
      const node = this.dependencyTree.get(key);
      if (!node) {
        throw new Error("Dependency node missing");
      }
      node.dependencies.forEach((dependencyKey) => {
        const dependencyNode = this.dependencyTree.get(dependencyKey);
        dependencyNode?.dependents.delete(key);
      });
      node.dependencies = new Set();
      this.formulas.delete(key);
      this.markDirty(key, visited);
      return;
    }

    if (typeof cell.formula !== "string" || cell.formula.trim().length === 0) {
      throw new Error("Formula cell requires formula content");
    }

    const parsed = parseFormula(cell.formula, {
      defaultSheetId: normalizedAddress.sheetId,
      defaultSheetName: normalizedAddress.sheetName,
      workbookIndex: this.workbookIndex,
    });

    const parsedFormula: ParsedFormula = {
      address: normalizedAddress,
      formula: cell.formula,
      ast: parsed.ast,
      dependencies: parsed.dependencies,
      dependencyAddresses: parsed.dependencyAddresses,
    };
    this.formulas.set(key, parsedFormula);
    parsed.dependencyAddresses.forEach((dependencyAddress) => {
      const dependencyKey = createCellAddressKey(dependencyAddress);
      if (!this.dependencyTree.has(dependencyKey)) {
        this.dependencyTree.set(dependencyKey, {
          address: dependencyAddress,
          dependencies: new Set(),
          dependents: new Set([key]),
        });
      } else {
        const dependencyNode = this.dependencyTree.get(dependencyKey);
        dependencyNode?.dependents.add(key);
      }
      if (!this.cells.has(dependencyKey)) {
        this.cells.set(dependencyKey, null);
        this.states.set(dependencyKey, createInitialState());
      }
    });

    this.updateDependenciesForFormula(key, parsedFormula);
    this.markDirty(key, visited);
  }
}
