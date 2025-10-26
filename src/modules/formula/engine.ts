/**
 * @file Formula evaluation engine with dependency-aware memoization and component-level caching.
 */

import type { SpreadSheet } from "../../types";
import { buildWorkbookMatrix } from "./matrix";
import { buildDependencyTree } from "./dependencyTree";
import type { BuildDependencyTreeResult } from "./dependencyTree";
import { buildDependencyComponents } from "./components";
import { createCellAddressKey, parseCellReference, parseCellAddressKeyParts } from "./address";
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
import { type FormulaAstNode, type RangeNode } from "./ast";
import { parseFormula } from "./parser";
import { formulaFunctionHelpers, getFormulaFunction } from "./functionRegistry";
import { coerceScalar, requireNumber, isArrayResult, type EvalResult } from "./functions/helpers";

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
      const originAddress = this.keyToAddress(key);
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
      }, originAddress);
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
        const originAddress = this.keyToAddress(nodeKey);
        const result = this.evaluateFormula(parsed.ast, {
          resolve: (address) => {
            const resolved = resolveDependency(address);
            const dependencyId = createCellAddressKey(address);
            dependencyVersionMap.set(dependencyId, resolved.version);
            return resolved;
          },
        }, originAddress);

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

  private evaluateFormula(
    ast: FormulaAstNode,
    scope: FormulaEvaluationScope,
    origin: CellAddress,
  ): EvalResult {
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
      const value = this.evaluateFormula(ast.argument, scope, origin);
      if (ast.operator === "+") {
        return requireNumber(value, "unary plus");
      }
      return -requireNumber(value, "unary minus");
    }

    if (ast.type === "Binary") {
      const left = this.evaluateFormula(ast.left, scope, origin);
      const right = this.evaluateFormula(ast.right, scope, origin);
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
      if (isComparatorFunction(ast.name)) {
        const evaluatedArgs = ast.arguments.map((argument) =>
          this.evaluateFormula(argument, scope, origin),
        );
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

      const definition = getFormulaFunction(ast.name);
      if (!definition) {
        throw new Error(`Unknown function "${ast.name}"`);
      }

      if (definition.evaluateLazy) {
        return definition.evaluateLazy(ast.arguments, {
          evaluate: (node) => this.evaluateFormula(node, scope, origin),
          helpers: formulaFunctionHelpers,
          parseReference: (reference) =>
            parseCellReference(reference, {
              defaultSheetId: origin.sheetId,
              defaultSheetName: origin.sheetName,
              workbookIndex: this.workbookIndex,
            }),
          origin,
        });
      }

      if (!definition.evaluate) {
        throw new Error(`Formula function "${ast.name}" must provide an eager evaluator`);
      }

      const evaluatedArgs = ast.arguments.map((argument) =>
        this.evaluateFormula(argument, scope, origin),
      );
      return definition.evaluate(evaluatedArgs, formulaFunctionHelpers);
    }

    throw new Error("Unsupported formula node");
  }

  private evaluateRange(range: RangeNode, scope: FormulaEvaluationScope): EvalResult {
    if (range.start.sheetId !== range.end.sheetId) {
      throw new Error("Cross-sheet ranges are not supported");
    }

    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);
    const minColumn = Math.min(range.start.column, range.end.column);
    const maxColumn = Math.max(range.start.column, range.end.column);

    const rows: FormulaEvaluationResult[][] = [];

    for (let row = minRow; row <= maxRow; row += 1) {
      const rowValues: FormulaEvaluationResult[] = [];
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const address: CellAddress = {
          sheetId: range.start.sheetId,
          sheetName: range.start.sheetName,
          row,
          column,
        };
        rowValues.push(scope.resolve(address).value);
      }
      rows.push(rowValues);
    }

    return rows;
  }

  private keyToAddress(key: CellAddressKey): CellAddress {
    const { sheetId, column, row } = parseCellAddressKeyParts(key);
    const sheetInfo = this.sheetInfo.get(sheetId);
    if (sheetInfo) {
      return {
        sheetId,
        sheetName: sheetInfo.sheetName,
        column,
        row,
      };
    }
    const sheetIndex = this.workbookIndex.byId.get(sheetId);
    if (!sheetIndex) {
      throw new Error(`Unknown sheet id "${sheetId}"`);
    }
    return {
      sheetId,
      sheetName: sheetIndex.name,
      column,
      row,
    };
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
