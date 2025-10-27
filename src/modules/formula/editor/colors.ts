/**
 * @file Shared color palette for formula reference highlighting.
 */

export type FormulaReferenceColorPair = {
  readonly start: string;
  readonly end: string;
};

export const FORMULA_REFERENCE_COLORS: readonly FormulaReferenceColorPair[] = [
  { start: "#2563eb", end: "#60a5fa" },
  { start: "#16a34a", end: "#86efac" },
  { start: "#9333ea", end: "#c4b5fd" },
  { start: "#dc2626", end: "#f87171" },
  { start: "#ca8a04", end: "#facc15" },
  { start: "#0e7490", end: "#38bdf8" },
];
