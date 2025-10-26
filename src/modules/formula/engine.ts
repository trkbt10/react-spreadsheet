/**
 * @file Formula evaluation engine with dependency-aware memoization and component-level caching.
 */

import type { SpreadSheet } from "../../types";
import { buildWorkbookMatrix } from "./matrix";
import { buildDependencyTree } from "./dependencyTree";
import type { BuildDependencyTreeResult } from "./dependencyTree";
import { buildDependencyComponents } from "./components";
import { createCellAddressKey, parseCellReference } from "./address";
import type {
  CellAddress,
  CellAddressKey,
  DependencyComponent,
  DependencyComponentIndex,
  DependencyTree,
  FormulaCellData,
  FormulaEvaluationResult,
  FormulaWorkbookGrid,
  ParsedFormula,
  WorkbookIndex,
} from "./types";
import { expandRangeAddresses, type FormulaAstNode, type RangeNode } from "./ast";
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

type ComponentState = {
  dirty: boolean;
  version: number;
  externalDependenciesVersion: Map<CellAddressKey, number>;
};

type EvalResult = FormulaEvaluationResult | FormulaEvaluationResult[];

type ResolvedDependency = {
  value: FormulaEvaluationResult;
  version: number;
};

type FormulaEvaluationScope = {
  resolve: (address: CellAddress) => ResolvedDependency;
};

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

const COUNTIF_COMPARATORS = ["<>", ">=", "<=", ">", "<", "="] as const;

type CountIfComparator = (typeof COUNTIF_COMPARATORS)[number];

const NUMERIC_CRITERION_PATTERN = /^-?\d+(?:\.\d+)?$/u;

const comparePrimitiveEquality = (left: FormulaEvaluationResult, right: FormulaEvaluationResult): boolean => {
  if (left === null || right === null) {
    return left === right;
  }
  if (typeof left !== typeof right) {
    return false;
  }
  if (typeof left === "number") {
    if (Number.isNaN(left) || Number.isNaN(right as number)) {
      return false;
    }
    return Object.is(left, right);
  }
  return left === right;
};

const parseNumericCriterion = (text: string, description: string): number => {
  const normalized = text.trim();
  if (!NUMERIC_CRITERION_PATTERN.test(normalized)) {
    throw new Error(`${description} expects numeric operand`);
  }
  return Number.parseFloat(normalized);
};

const parseCriterionOperand = (text: string): FormulaEvaluationResult => {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return "";
  }
  if (NUMERIC_CRITERION_PATTERN.test(normalized)) {
    return Number.parseFloat(normalized);
  }
  const lowerCase = normalized.toLowerCase();
  if (lowerCase === "true") {
    return true;
  }
  if (lowerCase === "false") {
    return false;
  }
  return normalized;
};

const compareNumbers = (value: number, operand: number, comparator: CountIfComparator): boolean => {
  switch (comparator) {
    case ">":
      return value > operand;
    case "<":
      return value < operand;
    case ">=":
      return value >= operand;
    case "<=":
      return value <= operand;
    case "=":
      return value === operand;
    case "<>":
      return value !== operand;
    default:
      throw new Error(`Unsupported numeric comparator "${comparator}"`);
  }
};

const createCountIfPredicate = (criteria: FormulaEvaluationResult): ((value: FormulaEvaluationResult) => boolean) => {
  if (criteria === null) {
    return (value) => value === null;
  }

  if (criteria === "") {
    return (value) => comparePrimitiveEquality(value, "");
  }

  if (typeof criteria === "number" || typeof criteria === "boolean") {
    return (value) => comparePrimitiveEquality(value, criteria);
  }

  if (typeof criteria !== "string") {
    throw new Error("COUNTIF criteria must be string, number, boolean, or null");
  }

  const trimmed = criteria.trim();
  const comparator = COUNTIF_COMPARATORS.find((symbol) => trimmed.startsWith(symbol)) ?? null;

  if (!comparator) {
    const operand = parseCriterionOperand(trimmed);
    return (value) => comparePrimitiveEquality(value, operand);
  }

  const operandText = trimmed.slice(comparator.length);
  if (operandText.length === 0) {
    throw new Error("COUNTIF comparator requires right-hand operand");
  }

  if (comparator === ">" || comparator === "<" || comparator === ">=" || comparator === "<=") {
    const operandNumber = parseNumericCriterion(operandText, "COUNTIF comparator");
    return (value) => typeof value === "number" && compareNumbers(value, operandNumber, comparator);
  }

  const operand = parseCriterionOperand(operandText);
  if (typeof operand === "number") {
    return (value) => typeof value === "number" && compareNumbers(value, operand, comparator);
  }

  if (comparator === "=") {
    return (value) => comparePrimitiveEquality(value, operand);
  }

  if (comparator === "<>") {
    return (value) => !comparePrimitiveEquality(value, operand);
  }

  throw new Error(`Unsupported COUNTIF comparator "${comparator}"`);
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
  COUNTIF: (args) => {
    if (args.length !== 2) {
      throw new Error("COUNTIF expects exactly two arguments");
    }
    const [rangeArg, criteriaArg] = args;
    const values = flattenValues([rangeArg]);
    const criteria = coerceScalar(criteriaArg, "COUNTIF criteria");
    const predicate = createCountIfPredicate(criteria);
    return values.reduce<number>((count, value) => (predicate(value) ? count + 1 : count), 0);
  },
});

const functionEvaluators = createFunctionEvaluators();

const isComparatorFunction = (name: string): boolean => name.startsWith("COMPARE_");

export class FormulaEngine {
  private readonly workbookIndex: WorkbookIndex;
  private dependencyTree: DependencyTree;
  private formulas: Map<CellAddressKey, ParsedFormula>;
  private readonly cells: Map<CellAddressKey, FormulaCellData | null>;
  private readonly states: Map<CellAddressKey, CellState>;
  private readonly sheetInfo: Map<string, SheetInfo>;
  private components: Map<string, DependencyComponent>;
  private componentIndex: DependencyComponentIndex;
  private componentStates: Map<string, ComponentState>;

  private constructor(
    workbookIndex: WorkbookIndex,
    treeResult: BuildDependencyTreeResult,
    matrix: FormulaWorkbookGrid,
  ) {
    this.workbookIndex = workbookIndex;
    this.dependencyTree = treeResult.tree;
    this.formulas = treeResult.formulas;
    this.cells = new Map();
    this.states = new Map();
    this.sheetInfo = new Map();
    this.components = new Map();
    this.componentIndex = new Map();
    this.componentStates = new Map();

    this.populateCellsFromMatrix(matrix);
    this.ensureStatesForTreeNodes();
    this.refreshComponents();
  }

  static fromSpreadsheet(spreadsheet: SpreadSheet): FormulaEngine {
    const { matrix, index } = buildWorkbookMatrix(spreadsheet);
    const treeResult = buildDependencyTree({ matrix, index });
    return new FormulaEngine(index, treeResult, matrix);
  }

  resolveCellValue(address: CellAddress): FormulaEvaluationResult {
    const key = createCellAddressKey(address);
    return this.evaluateCellInternal(key, new Set()).value;
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

    const rows: FormulaEvaluationResult[][] = [];

    for (let row = 0; row < info.rows; row += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let column = 0; column < info.columns; column += 1) {
        rowValues.push(this.resolveCellValueByCoords(sheetId, column, row));
      }
      rows.push(rowValues);
    }

    return rows;
  }

  updateCell(address: CellAddress, cell: FormulaCellData | null): void {
    const normalizedAddress = this.ensureAddress(address);
    const key = createCellAddressKey(normalizedAddress);

    this.cells.set(key, cell);
    const state = this.ensureState(key);
    state.dirty = true;

    let node = this.dependencyTree.get(key);
    if (!node) {
      node = {
        address: normalizedAddress,
        dependencies: new Set(),
        dependents: new Set(),
      };
      this.dependencyTree.set(key, node);
    } else {
      node.address = normalizedAddress;
    }

    const touchedKeys = new Set<CellAddressKey>([key]);

    if (!cell || cell.type !== "formula") {
      node.dependencies.forEach((dependencyKey) => {
        const dependencyNode = this.dependencyTree.get(dependencyKey);
        dependencyNode?.dependents.delete(key);
      });
      node.dependencies = new Set();
      this.formulas.delete(key);
      this.markDirtySubtree(key);
      this.refreshComponents(touchedKeys);
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

    node.dependencies.forEach((dependencyKey) => {
      const dependencyNode = this.dependencyTree.get(dependencyKey);
      dependencyNode?.dependents.delete(key);
    });
    node.dependencies = new Set(parsed.dependencies);

    parsed.dependencyAddresses.forEach((dependencyAddress) => {
      const dependencyKey = createCellAddressKey(dependencyAddress);
      let dependencyNode = this.dependencyTree.get(dependencyKey);
      if (!dependencyNode) {
        dependencyNode = {
          address: dependencyAddress,
          dependencies: new Set(),
          dependents: new Set(),
        };
        this.dependencyTree.set(dependencyKey, dependencyNode);
      }
      dependencyNode.dependents.add(key);
      touchedKeys.add(dependencyKey);
      if (!this.cells.has(dependencyKey)) {
        this.cells.set(dependencyKey, null);
        this.states.set(dependencyKey, createInitialState());
      }
    });

    this.formulas.set(key, {
      address: normalizedAddress,
      formula: cell.formula,
      ast: parsed.ast,
      dependencies: parsed.dependencies,
      dependencyAddresses: parsed.dependencyAddresses,
    });

    this.markDirtySubtree(key);
    this.refreshComponents(touchedKeys);
  }

  private populateCellsFromMatrix(matrix: FormulaWorkbookGrid): void {
    matrix.forEach((sheetGrid) => {
      const rowCount = sheetGrid.maxRow >= 0 ? sheetGrid.maxRow + 1 : 0;
      const columnCount = sheetGrid.maxColumn >= 0 ? sheetGrid.maxColumn + 1 : 0;
      this.sheetInfo.set(sheetGrid.sheetId, {
        sheetId: sheetGrid.sheetId,
        sheetName: sheetGrid.sheetName,
        rows: rowCount,
        columns: columnCount,
      });

      sheetGrid.rows.forEach((rowMap, rowIndex) => {
        rowMap.forEach((cellData, columnIndex) => {
          const address: CellAddress = {
            sheetId: sheetGrid.sheetId,
            sheetName: sheetGrid.sheetName,
            row: rowIndex,
            column: columnIndex,
          };
          const key = createCellAddressKey(address);
          this.cells.set(key, cellData);
          this.states.set(key, createInitialState());
        });
      });
    });
  }

  private ensureStatesForTreeNodes(): void {
    this.dependencyTree.forEach((node, key) => {
      if (!this.cells.has(key)) {
        this.cells.set(key, null);
      }
      if (!this.states.has(key)) {
        this.states.set(key, createInitialState());
      }
      if (!this.sheetInfo.has(node.address.sheetId)) {
        this.sheetInfo.set(node.address.sheetId, {
          sheetId: node.address.sheetId,
          sheetName: node.address.sheetName,
          rows: node.address.row + 1,
          columns: node.address.column + 1,
        });
      }
    });
  }

  private refreshComponents(changedKeys: Set<CellAddressKey> = new Set()): void {
    const { components, componentIndex } = buildDependencyComponents(this.dependencyTree);
    const nextComponentStates = new Map<string, ComponentState>();

    components.forEach((component) => {
      const existingState = this.componentStates.get(component.id);
      const intersectsChange = Array.from(component.nodes).some((nodeKey) => changedKeys.has(nodeKey));
      const shouldMarkDirty = intersectsChange || !existingState;

      const externalVersions = shouldMarkDirty ? new Map<CellAddressKey, number>() : new Map(existingState?.externalDependenciesVersion ?? []);

      const componentState: ComponentState = {
        dirty: shouldMarkDirty ? true : existingState?.dirty ?? true,
        version: existingState?.version ?? 0,
        externalDependenciesVersion: externalVersions,
      };

      if (componentState.dirty) {
        component.nodes.forEach((nodeKey) => {
          const nodeState = this.states.get(nodeKey);
          if (nodeState) {
            nodeState.dirty = true;
          }
        });
      }

      nextComponentStates.set(component.id, componentState);
    });

    this.components = components;
    this.componentIndex = componentIndex;
    this.componentStates = nextComponentStates;
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

  private evaluateCellInternal(key: CellAddressKey, stack: Set<CellAddressKey>): CellState {
    const componentId = this.componentIndex.get(key);
    if (componentId) {
      this.ensureComponentEvaluated(componentId, stack);
      return this.ensureState(key);
    }
    return this.evaluateStandaloneNode(key, stack);
  }

  private evaluateStandaloneNode(key: CellAddressKey, stack: Set<CellAddressKey>): CellState {
    const state = this.ensureState(key);
    if (!state.dirty && !this.haveDependenciesChanged(state)) {
      return state;
    }

    if (stack.has(key)) {
      throw new Error("Circular dependency detected");
    }

    stack.add(key);
    const cell = this.cells.get(key);
    let dependencyVersions = new Map<CellAddressKey, number>();
    let newValue: FormulaEvaluationResult;

    if (!cell) {
      newValue = null;
    } else if (cell.type === "formula") {
      const parsed = this.formulas.get(key);
      if (!parsed) {
        throw new Error("Formula definition missing for cell");
      }
      const dependencyVersionMap = new Map<CellAddressKey, number>();
      const result = this.evaluateFormula(parsed.ast, {
        resolve: (address) => {
          const dependencyKey = createCellAddressKey(address);
          const dependencyState = this.evaluateCellInternal(dependencyKey, stack);
          dependencyVersionMap.set(dependencyKey, dependencyState.version);
          return {
            value: dependencyState.value,
            version: dependencyState.version,
          };
        },
      });
      if (isArrayResult(result)) {
        throw new Error("Formula cannot resolve directly to a range");
      }
      newValue = result;
      dependencyVersions = dependencyVersionMap;
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

  private ensureComponentEvaluated(componentId: string, stack: Set<CellAddressKey>): void {
    const component = this.components.get(componentId);
    if (!component) {
      return;
    }
    const componentState = this.componentStates.get(componentId) ?? {
      dirty: true,
      version: 0,
      externalDependenciesVersion: new Map(),
    };

    if (!componentState.dirty && !this.haveExternalDependenciesChanged(component, componentState, stack)) {
      return;
    }

    this.evaluateComponent(component, componentState, stack);
  }

  private haveDependenciesChanged(state: CellState): boolean {
    for (const [dependencyKey, recordedVersion] of state.dependenciesVersion.entries()) {
      const dependencyState = this.states.get(dependencyKey);
      if (!dependencyState || dependencyState.version !== recordedVersion) {
        return true;
      }
    }
    return false;
  }

  private haveExternalDependenciesChanged(
    component: DependencyComponent,
    componentState: ComponentState,
    stack: Set<CellAddressKey>,
  ): boolean {
    for (const dependencyKey of component.externalDependencies) {
      const dependencyState = this.evaluateCellInternal(dependencyKey, new Set(stack));
      const recorded = componentState.externalDependenciesVersion.get(dependencyKey);
      if (recorded === undefined || dependencyState.version !== recorded) {
        return true;
      }
    }
    return false;
  }

  private evaluateComponent(
    component: DependencyComponent,
    componentState: ComponentState,
    stack: Set<CellAddressKey>,
  ): void {
    const processed = new Set<CellAddressKey>();
    const externalDependencyVersions = new Map<CellAddressKey, number>();

    const resolveDependency = (address: CellAddress): ResolvedDependency => {
      const dependencyKey = createCellAddressKey(address);
      if (component.nodes.has(dependencyKey)) {
        if (!processed.has(dependencyKey)) {
          throw new Error(`Detected out-of-order dependency evaluation for "${dependencyKey}"`);
        }
        const dependencyState = this.states.get(dependencyKey);
        if (!dependencyState) {
          throw new Error(`Missing state for dependency "${dependencyKey}"`);
        }
        return {
          value: dependencyState.value,
          version: dependencyState.version,
        };
      }

      const dependencyState = this.evaluateCellInternal(dependencyKey, new Set(stack));
      externalDependencyVersions.set(dependencyKey, dependencyState.version);
      return {
        value: dependencyState.value,
        version: dependencyState.version,
      };
    };

    component.topologicalOrder.forEach((nodeKey) => {
      const cell = this.cells.get(nodeKey);
      const state = this.ensureState(nodeKey);
      let dependencyVersions = new Map<CellAddressKey, number>();
      let newValue: FormulaEvaluationResult;

      if (!cell) {
        newValue = null;
      } else if (cell.type === "formula") {
        const parsed = this.formulas.get(nodeKey);
        if (!parsed) {
          throw new Error("Formula definition missing for cell");
        }
        const dependencyVersionMap = new Map<CellAddressKey, number>();
        const result = this.evaluateFormula(parsed.ast, {
          resolve: (address) => {
            const resolved = resolveDependency(address);
            const dependencyId = createCellAddressKey(address);
            dependencyVersionMap.set(dependencyId, resolved.version);
            return resolved;
          },
        });

        if (isArrayResult(result)) {
          throw new Error("Formula cannot resolve directly to a range");
        }

        newValue = result;
        dependencyVersions = dependencyVersionMap;
      } else {
        newValue = toPrimitive(cell.value);
      }

      const valueChanged = !Object.is(state.value, newValue);
      state.value = newValue;
      state.dependenciesVersion = dependencyVersions;
      state.dirty = false;
      state.version = valueChanged ? state.version + 1 : state.version;

      processed.add(nodeKey);
    });

    componentState.dirty = false;
    componentState.version += 1;
    componentState.externalDependenciesVersion = externalDependencyVersions;
    this.componentStates.set(component.id, componentState);
  }

  private evaluateFormula(ast: FormulaAstNode, scope: FormulaEvaluationScope): EvalResult {
    if (ast.type === "Literal") {
      return ast.value;
    }

    if (ast.type === "Reference") {
      return scope.resolve(ast.address).value;
    }

    if (ast.type === "Range") {
      return this.evaluateRange(ast, scope);
    }

    if (ast.type === "Unary") {
      const value = this.evaluateFormula(ast.argument, scope);
      if (ast.operator === "+") {
        return requireNumber(value, "unary plus");
      }
      return -requireNumber(value, "unary minus");
    }

    if (ast.type === "Binary") {
      const left = this.evaluateFormula(ast.left, scope);
      const right = this.evaluateFormula(ast.right, scope);
      const operator = ast.operator;
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

    if (ast.type === "Function") {
      if (ast.name === "IF") {
        if (ast.arguments.length < 2 || ast.arguments.length > 3) {
          throw new Error("IF requires two or three arguments");
        }
        const condition = this.evaluateFormula(ast.arguments[0], scope);
        const conditionValue = requireBoolean(condition, "IF condition");
        if (conditionValue) {
          return this.evaluateFormula(ast.arguments[1], scope);
        }
        if (ast.arguments.length === 3) {
          return this.evaluateFormula(ast.arguments[2], scope);
        }
        return null;
      }

      const evaluatedArgs = ast.arguments.map((argument) => this.evaluateFormula(argument, scope));

      if (isComparatorFunction(ast.name)) {
        const comparator = ast.name.slice("COMPARE_".length);
        const comparatorFn = comparatorFns[comparator];
        if (!comparatorFn) {
          throw new Error(`Unsupported comparator "${ast.name}"`);
        }
        if (evaluatedArgs.length !== 2) {
          throw new Error("Comparators require exactly two arguments");
        }
        return comparatorFn(evaluatedArgs[0], evaluatedArgs[1]);
      }

      const evaluator = functionEvaluators[ast.name];
      if (!evaluator) {
        throw new Error(`Unknown function "${ast.name}"`);
      }
      return evaluator(evaluatedArgs);
    }

    throw new Error("Unsupported formula node");
  }

  private evaluateRange(range: RangeNode, scope: FormulaEvaluationScope): FormulaEvaluationResult[] {
    const addresses = expandRangeAddresses(range.start, range.end);
    return addresses.map((address) => scope.resolve(address).value);
  }

  private ensureAddress(address: CellAddress): CellAddress {
    const info = this.sheetInfo.get(address.sheetId);
    if (!info) {
      const newInfo: SheetInfo = {
        sheetId: address.sheetId,
        sheetName: address.sheetName,
        rows: address.row + 1,
        columns: address.column + 1,
      };
      this.sheetInfo.set(address.sheetId, newInfo);
      return address;
    }

    if (address.sheetName !== info.sheetName) {
      return {
        ...address,
        sheetName: info.sheetName,
      };
    }

    if (address.row + 1 > info.rows) {
      info.rows = address.row + 1;
    }
    if (address.column + 1 > info.columns) {
      info.columns = address.column + 1;
    }

    return address;
  }

  private markDirtySubtree(startKey: CellAddressKey): void {
    const queue: CellAddressKey[] = [startKey];
    const visited = new Set<CellAddressKey>();

    while (queue.length > 0) {
      const key = queue.shift();
      if (!key || visited.has(key)) {
        continue;
      }
      visited.add(key);

      this.markComponentDirtyForKey(key);
      const node = this.dependencyTree.get(key);
      if (!node) {
        continue;
      }
      node.dependents.forEach((dependentKey) => {
        queue.push(dependentKey);
      });
    }
  }

  private markComponentDirtyForKey(key: CellAddressKey): void {
    const componentId = this.componentIndex.get(key);
    if (!componentId) {
      const state = this.states.get(key);
      if (state) {
        state.dirty = true;
      }
      return;
    }

    const componentState = this.componentStates.get(componentId);
    if (componentState) {
      componentState.dirty = true;
    }

    const component = this.components.get(componentId);
    component?.nodes.forEach((nodeKey) => {
      const nodeState = this.states.get(nodeKey);
      if (nodeState) {
        nodeState.dirty = true;
      }
    });
  }
}
