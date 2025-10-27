/**
 * @file Utilities for analysing formula text and deriving argument targeting metadata.
 */

import { parseTopLevelFunction, type ParsedFunctionCall } from "../formula/editor/analysis";
import { parseReferenceToCellRange } from "../formula/editor/references";
import { FORMULA_REFERENCE_COLORS, type FormulaReferenceColorPair } from "../formula/editor/colors";
import type { SpreadSheet } from "../../types";
import type { FormulaReferenceHighlight } from "./formulaTargetingTypes";
import type { CellRange } from "./formulaTargetingTypes";

export type FormulaArgumentBehaviour = "any" | "value" | "range" | "row" | "column";

const ARGUMENT_LABEL_PREFIX = "Argument";

const FUNCTION_ARGUMENT_BEHAVIOUR: Record<string, FormulaArgumentBehaviour[]> = {
  SUM: ["range"],
  SUMIF: ["range", "range", "range"],
  SUMIFS: [],
  AVERAGE: ["range"],
  AVERAGEIF: ["range", "range", "range"],
  VLOOKUP: ["value", "range", "value", "value"],
  HLOOKUP: ["value", "range", "value", "value"],
  MATCH: ["value", "range", "value"],
  INDEX: ["range", "value", "value", "value"],
  OFFSET: ["range", "value", "value", "value", "value", "value"],
  IF: ["value", "value", "value"],
  CHOOSE: ["value"],
};

const getBehaviourLabel = (behaviour: FormulaArgumentBehaviour): string => {
  switch (behaviour) {
    case "range":
      return "Range";
    case "row":
      return "Row";
    case "column":
      return "Column";
    case "value":
      return "Value";
    default:
      return "Reference";
  }
};

const resolveArgumentBehaviour = (functionName: string | null, index: number): FormulaArgumentBehaviour => {
  if (!functionName) {
    return "any";
  }
  const behaviours = FUNCTION_ARGUMENT_BEHAVIOUR[functionName.toUpperCase()];
  if (!behaviours || behaviours.length === 0) {
    return "any";
  }
  const behaviour = behaviours[index];
  if (!behaviour) {
    return behaviours[behaviours.length - 1] ?? "any";
  }
  return behaviour;
};

const createArgumentLabel = (argumentIndex: number, behaviour: FormulaArgumentBehaviour): string => {
  const baseLabel = `${ARGUMENT_LABEL_PREFIX} ${argumentIndex + 1}`;
  if (behaviour === "any") {
    return baseLabel;
  }
  return `${baseLabel} · ${getBehaviourLabel(behaviour)}`;
};

const resolveSheetIdByName = (spreadsheet: SpreadSheet, sheetName: string | null): string | null => {
  if (!sheetName) {
    return null;
  }
  const found = spreadsheet.sheets.find((sheet) => sheet.name === sheetName);
  return found?.id ?? null;
};

const selectColorPair = (index: number): FormulaReferenceColorPair => {
  const colorPairs = FORMULA_REFERENCE_COLORS;
  return colorPairs[index % colorPairs.length] ?? colorPairs[0] ?? { start: "#2563eb", end: "#60a5fa" };
};

export type FormulaArgumentEntry = {
  readonly argumentIndex: number;
  readonly replaceStart: number;
  readonly replaceEnd: number;
  readonly text: string;
  readonly behaviour: FormulaArgumentBehaviour;
  readonly label: string;
  readonly highlight: FormulaReferenceHighlight | null;
  readonly tokens:
    | { kind: "range"; start: string; separator: string; end: string }
    | { kind: "value"; value: string };
  readonly color: FormulaReferenceColorPair;
  readonly sheetName: string | null;
  readonly range: CellRange | null;
};

export type FormulaTargetingAnalysis = {
  readonly analysis: ParsedFunctionCall | null;
  readonly entries: ReadonlyArray<FormulaArgumentEntry>;
  readonly activeEntry: FormulaArgumentEntry | null;
};

const RANGE_TOKEN_PATTERN = /^(?<start>[^:]+?)(?<separator>\s*:\s*)(?<end>.+)$/u;

const extractRangeTokens = (
  value: string,
): { kind: "range"; start: string; separator: string; end: string } | null => {
  const match = value.match(RANGE_TOKEN_PATTERN);
  if (!match?.groups) {
    return null;
  }
  const start = match.groups.start.trim();
  const end = match.groups.end.trim();
  if (!start || !end) {
    return null;
  }
  return {
    kind: "range",
    start,
    separator: match.groups.separator ?? ":",
    end,
  };
};

export const analyseFormulaForTargeting = ({
  value,
  caret,
  sheetId,
  sheetName,
  spreadsheet,
}: {
  value: string;
  caret: { start: number; end: number };
  sheetId: string;
  sheetName: string;
  spreadsheet: SpreadSheet;
}): FormulaTargetingAnalysis => {
  const trimmed = value.trimStart();
  const startsWithEquals = trimmed.startsWith("=");
  const parsed = startsWithEquals ? parseTopLevelFunction(value, caret) : null;

  if (!parsed) {
    return {
      analysis: null,
      entries: [],
      activeEntry: null,
    };
  }

  const entries = parsed.arguments.map<FormulaArgumentEntry>((argument) => {
    const colour = selectColorPair(argument.index);
    const behaviour = resolveArgumentBehaviour(parsed.name, argument.index);
    const label = createArgumentLabel(argument.index, behaviour);
    const trimmedArgument = argument.text.trim();
    const parsedReference = trimmedArgument.length > 0 ? parseReferenceToCellRange(trimmedArgument) : null;
    const targetSheetId =
      resolveSheetIdByName(spreadsheet, parsedReference?.sheetName ?? null) ?? sheetId;
    const highlight: FormulaReferenceHighlight | null = parsedReference
      ? {
          id: `${parsed.name}-${argument.index}`,
          label: trimmedArgument,
          sheetId: targetSheetId,
          startColor: colour.start,
          endColor: colour.end,
          range: parsedReference.range,
        }
      : null;

    const tokens = (() => {
      if (parsedReference && trimmedArgument.includes(":")) {
        const extracted = extractRangeTokens(trimmedArgument);
        if (extracted) {
          return extracted;
        }
      }
      return { kind: "value", value: trimmedArgument } as const;
    })();

    return {
      argumentIndex: argument.index,
      replaceStart: argument.start,
      replaceEnd: argument.end,
      text: trimmedArgument,
      behaviour,
      label,
      highlight,
      tokens,
      color: colour,
      sheetName: parsedReference?.sheetName ?? sheetName,
      range: parsedReference?.range ?? null,
    };
  });

  if (entries.length === 0) {
    const fallback = createFallbackArgumentEntry({
      caret,
      sheetId,
      sheetName,
      value,
    });
    return {
      analysis: parsed,
      entries: [fallback],
      activeEntry: fallback,
    };
  }

  const activeEntry =
    parsed.activeArgumentIndex !== null
      ? entries.find((entry) => entry.argumentIndex === parsed.activeArgumentIndex) ?? null
      : null;

  return {
    analysis: parsed,
    entries,
    activeEntry,
  };
};

export const createFallbackArgumentEntry = ({
  caret,
  sheetId,
  sheetName,
  value,
}: {
  caret: { start: number; end: number };
  sheetId: string;
  sheetName: string;
  value: string;
}): FormulaArgumentEntry => {
  const colour = selectColorPair(0);
  const fallbackIndex = (() => {
    if (caret.start !== caret.end) {
      return caret.end;
    }
    const lastOpen = value.lastIndexOf("(");
    if (lastOpen >= 0) {
      return lastOpen + 1;
    }
    return value.length;
  })();
  return {
    argumentIndex: 0,
    replaceStart: fallbackIndex,
    replaceEnd: fallbackIndex,
    text: "",
    behaviour: "any",
    label: createArgumentLabel(0, "any"),
    highlight: null,
    tokens: { kind: "value", value: "" },
    color: colour,
    sheetName,
    range: null,
  };
};
