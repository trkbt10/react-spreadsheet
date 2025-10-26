/**
 * @file VLOOKUP function implementation (ODF 1.3 §6.14.14).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { toLookupTable, readTableCell } from "./table";

export const vlookupFunction: FormulaFunctionEagerDefinition = {
  name: "VLOOKUP",
  description: {
    en: "Searches the first column of a table for a value and returns data from another column.",
    ja: "表の最初の列で値を検索し、別の列のデータを返します。",
  },
  examples: ["VLOOKUP(A2, Table1, 3, FALSE)", "VLOOKUP(5, A1:B10, 2)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 4) {
      throw new Error("VLOOKUP expects three or four arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "VLOOKUP lookup value");
    const table = toLookupTable(args[1], "VLOOKUP");

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
      const matchIndex = table.findIndex((_, rowIndex) => {
        const firstColumn = readTableCell(table, rowIndex, 0, "VLOOKUP");
        return helpers.comparePrimitiveEquality(firstColumn, lookupValue);
      });
      if (matchIndex === -1) {
        throw new Error("VLOOKUP could not find an exact match");
      }
      return readTableCell(table, matchIndex, columnIndex - 1, "VLOOKUP");
    }

    if (typeof lookupValue !== "number") {
      throw new Error("VLOOKUP approximate match requires numeric lookup value");
    }

    let candidateIndex: number | null = null;
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const firstColumn = readTableCell(table, rowIndex, 0, "VLOOKUP");
      if (typeof firstColumn !== "number") {
        throw new Error("VLOOKUP approximate match requires numeric table rows");
      }
      if (firstColumn > lookupValue) {
        break;
      }
      candidateIndex = rowIndex;
    }

    if (candidateIndex === null) {
      throw new Error("VLOOKUP could not find an approximate match");
    }

    return readTableCell(table, candidateIndex, columnIndex - 1, "VLOOKUP");
  },
};

// NOTE: Relies on shared lookup table utilities in src/modules/formula/functions/lookup/table.ts.
