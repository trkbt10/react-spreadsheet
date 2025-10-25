/**
 * @file Shared spreadsheet-related type definitions.
 */

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

// 計算について
// 縦横タブの三次元の配列と、その参照関係から構成される木構造の処理の二つに分けたら極めてシンプル
// Reactアプリは、Spreadsheetへの参照をContextで持たせた上で、そこにパッチを当てて内容を変更するイメージ
// ここで、計算などのデータは扱わない
// セルへは、Sheet->Cellの順でO(1+1)でアクセスできる
// 別のモジュールでformulaから木構造を作成し、その参照先でdepsを構築
// 依存関係でdepsが更新されたら、それ以降の木を再帰的に探索更新
// 結果は、それのスナップショットとしてセルに割り当てていくイメージ
