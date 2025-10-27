/**
 * @file Shared types for formula targeting interactions within the spreadsheet editor.
 */

export type CellRange = {
  readonly startCol: number;
  readonly startRow: number;
  readonly endCol: number;
  readonly endRow: number;
};

export type FormulaReferenceHighlight = {
  readonly id: string;
  readonly label: string;
  readonly sheetId: string;
  readonly startColor: string;
  readonly endColor: string;
  readonly range: CellRange;
};

export type FormulaTargetingState = {
  readonly replaceStart: number;
  readonly replaceEnd: number;
  readonly argumentLabel: string;
  readonly functionName: string;
  readonly argumentIndex: number;
  readonly originSheetId: string;
  readonly originSheetName: string;
  readonly startColor: string;
  readonly endColor: string;
  readonly previewRange: CellRange | null;
  readonly previewSheetId: string;
};
