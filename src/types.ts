/**
 * @file Shared spreadsheet-related type definitions.
 */

import type { GridRange } from "./modules/spreadsheet/gridLayout";

export type SpreadSheet = {
  name: string;
  meta?: Record<string, unknown>;
  sheets: Sheet[];
  createdAt: string;
  updatedAt: string;
};
export type X = number;
export type Y = number;
export type CellId = `${X}:${Y}`;
export type Sheet = {
  name: string;
  id: string;
  cells: {
    [cellId in CellId]?: Cell;
  };
  visualElements?: SheetVisualElementRegistry;
};

export type Cell = {
  id: CellId;
  x: X;
  y: Y;
  type: "string" | "number" | "boolean" | "null" | "formula";
  value: string | number | boolean | null;
  format?: CellFormat; // e.g., "currency", "percentage", etc. see FormatType
  formula?: string;
};

export type CellFormat = {
  type: "currency" | "percentage" | "date";
  options?: Record<string, unknown>;
};

export type VisualElementId = string;

export type CellRangeReference = {
  start: CellId;
  end: CellId;
};

export type VisualElementPosition = {
  readonly x: number;
  readonly y: number;
  readonly zIndex?: number;
};

export type VisualElementVisibility = {
  readonly hideWhenOutOfBounds: boolean;
  readonly bounds?: GridRange;
};

export type VisualElementRotationOrigin = {
  readonly horizontal: "center";
  readonly vertical: "center";
};

export type VisualElementRotation = {
  readonly angle: number;
  readonly origin: VisualElementRotationOrigin;
};

export type VisualElementTransform = {
  readonly width: number;
  readonly height: number;
  readonly rotation: VisualElementRotation;
};

export type SheetVisualElementBase = {
  id: VisualElementId;
  anchorCell: CellId;
  position: VisualElementPosition;
  visibility: VisualElementVisibility;
  transform: VisualElementTransform;
};

export type SheetImageElement = SheetVisualElementBase & {
  elementType: "image";
  source: string;
  altText?: string;
};

export type GraphType = "line" | "bar" | "column" | "pie" | "area" | "scatter";

export type GraphDataBinding = {
  readonly range: CellRangeReference;
  readonly labelCell?: CellId;
};

export type SheetGraphElement = SheetVisualElementBase & {
  elementType: "graph";
  graphType: GraphType;
  data: GraphDataBinding;
  options?: Record<string, unknown>;
};

export type SheetVisualElement = SheetImageElement | SheetGraphElement;

export type SheetVisualElementRegistry = {
  [elementId in VisualElementId]?: SheetVisualElement;
};

// 計算について
// 縦横タブの三次元の配列と、その参照関係から構成される木構造の処理の二つに分けたら極めてシンプル
// Reactアプリは、Spreadsheetへの参照をContextで持たせた上で、そこにパッチを当てて内容を変更するイメージ
// ここで、計算などのデータは扱わない
// セルへは、Sheet->Cellの順でO(1+1)でアクセスできる
// 別のモジュールでformulaから木構造を作成し、その参照先でdepsを構築
// 依存関係でdepsが更新されたら、それ以降の木を再帰的に探索更新
// 結果は、それのスナップショットとしてセルに割り当てていくイメージ

// Debug notes:
// - Referenced src/modules/spreadsheet/gridLayout.ts to align visibility bounds with GridRange usage for viewport calculations.
// - Referenced src/modules/spreadsheet/cellStyle.ts to follow existing discriminated union patterns when adding visual element types.
// - Referenced src/components/Sheet.tsx and src/hooks/useVirtualScroll.ts to ensure visual element positioning aligns with virtual scroll viewport computations.
