/**
 * @file VLOOKUP formula function.
 */

import type { FormulaFunctionDefinition } from "../functionRegistry";
import type { FormulaEvaluationResult } from "../types";
import type { EvalResult } from "./helpers";
import { isArrayResult } from "./helpers";

const normalizeRow = (row: EvalResult): EvalResult[] => {
  if (!isArrayResult(row)) {
    return [row];
  }
  return row;
};

const toTable = (result: EvalResult): EvalResult[][] => {
  if (!isArrayResult(result)) {
    throw new Error("VLOOKUP table range must be a range reference");
  }
  return result.map((row) => {
    const normalizedRow = normalizeRow(row);
    return normalizedRow.map((value) => {
      if (isArrayResult(value)) {
        throw new Error("VLOOKUP does not support nested ranges");
      }
      return value ?? null;
    });
  });
};

const getColumnValue = (
  row: EvalResult[],
  index: number,
  description: string,
): FormulaEvaluationResult => {
  const value = row[index];
  if (value === undefined) {
    throw new Error(`${description} failed: missing column in table range`);
  }
  if (isArrayResult(value)) {
    throw new Error(`${description} failed: nested range result is not supported`);
  }
  return (value ?? null) as FormulaEvaluationResult;
};

export const vlookupFunction: FormulaFunctionDefinition = {
  name: "VLOOKUP",
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 4) {
      throw new Error("VLOOKUP expects three or four arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "VLOOKUP lookup value");
    const table = toTable(args[1]);
    if (table.length === 0) {
      throw new Error("VLOOKUP table range cannot be empty");
    }

    const columnIndexRaw = helpers.requireNumber(args[2], "VLOOKUP column index");
    if (!Number.isInteger(columnIndexRaw)) {
      throw new Error("VLOOKUP column index must be an integer");
    }
    const columnIndex = columnIndexRaw;
    if (columnIndex < 1) {
      throw new Error("VLOOKUP column index must be greater than or equal to 1");
    }

    let approximateMatch = true;
    if (args.length === 4) {
      const rangeLookup = helpers.coerceScalar(args[3], "VLOOKUP range lookup");
      if (typeof rangeLookup !== "boolean") {
        throw new Error("VLOOKUP range lookup flag must be boolean");
      }
      approximateMatch = rangeLookup;
    }

    if (!approximateMatch) {
      const match = table.find((row) => {
        const firstColumn = getColumnValue(row, 0, "VLOOKUP");
        return helpers.comparePrimitiveEquality(firstColumn, lookupValue);
      });
      if (!match) {
        throw new Error("VLOOKUP could not find an exact match");
      }
      return getColumnValue(match, columnIndex - 1, "VLOOKUP");
    }

    if (typeof lookupValue !== "number") {
      throw new Error("VLOOKUP approximate match requires numeric lookup value");
    }

    let candidate: EvalResult[] | null = null;
    for (const row of table) {
      const firstColumn = getColumnValue(row, 0, "VLOOKUP");
      if (typeof firstColumn !== "number") {
        throw new Error("VLOOKUP approximate match requires numeric table rows");
      }
      if (firstColumn > lookupValue) {
        break;
      }
      candidate = row;
    }

    if (!candidate) {
      throw new Error("VLOOKUP could not find an approximate match");
    }

    return getColumnValue(candidate, columnIndex - 1, "VLOOKUP");
  },
};
