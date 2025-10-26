/**
 * @file HLOOKUP function implementation (ODF 1.3 §6.14.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { toLookupTable, readTableCell } from "./table";

export const hlookupFunction: FormulaFunctionEagerDefinition = {
  name: "HLOOKUP",
  category: "lookup",
  description: {
    en: "Searches the first row of a table for a value and returns data from another row.",
    ja: "表の最初の行で値を検索し、別の行のデータを返します。",
  },
  examples: ["HLOOKUP(A1, Table1, 2, FALSE)", "HLOOKUP(5, A1:J2, 2)"],
  samples: [
    {
      input: "HLOOKUP(\"B\", [[\"A\", \"B\", \"C\"], [10, 20, 30]], 2, FALSE)",
      output: 20,
      description: {
        en: "Exact match in horizontal table",
        ja: "横方向テーブルでの完全一致",
      },
    },
    {
      input: "HLOOKUP(2.5, [[1, 2, 3], [\"X\", \"Y\", \"Z\"]], 2, TRUE)",
      output: "Y",
      description: {
        en: "Approximate match in first row",
        ja: "最初の行での近似一致",
      },
    },
    {
      input: "HLOOKUP(\"Cat\", [[\"Apple\", \"Cat\", \"Dog\"], [5, 10, 15]], 2, FALSE)",
      output: 10,
      description: {
        en: "Text lookup in horizontal header",
        ja: "横方向ヘッダーでのテキスト検索",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 4) {
      throw new Error("HLOOKUP expects three or four arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "HLOOKUP lookup value");
    const table = toLookupTable(args[1], "HLOOKUP");

    const rowIndexRaw = helpers.requireNumber(args[2], "HLOOKUP row index");
    if (!Number.isInteger(rowIndexRaw)) {
      throw new Error("HLOOKUP row index must be an integer");
    }
    const rowIndex = rowIndexRaw;
    if (rowIndex < 1 || rowIndex > table.length) {
      throw new Error("HLOOKUP row index is out of bounds");
    }

    let approximateMatch = true;
    if (args.length === 4) {
      const rangeLookup = helpers.coerceScalar(args[3], "HLOOKUP range lookup");
      if (typeof rangeLookup !== "boolean") {
        throw new Error("HLOOKUP range lookup flag must be boolean");
      }
      approximateMatch = rangeLookup;
    }

    const targetRowIndex = rowIndex - 1;

    if (!approximateMatch) {
      const columnIndex = table[0].findIndex((_, column) =>
        helpers.comparePrimitiveEquality(readTableCell(table, 0, column, "HLOOKUP"), lookupValue),
      );
      if (columnIndex === -1) {
        throw new Error("HLOOKUP could not find an exact match");
      }
      return readTableCell(table, targetRowIndex, columnIndex, "HLOOKUP");
    }

    if (typeof lookupValue !== "number") {
      throw new Error("HLOOKUP approximate match requires numeric lookup value");
    }

    let candidateColumn: number | null = null;
    const columnCount = table[0].length;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const firstRowValue = readTableCell(table, 0, columnIndex, "HLOOKUP");
      if (typeof firstRowValue !== "number") {
        throw new Error("HLOOKUP approximate match requires numeric table columns");
      }
      if (firstRowValue > lookupValue) {
        break;
      }
      candidateColumn = columnIndex;
    }

    if (candidateColumn === null) {
      throw new Error("HLOOKUP could not find an approximate match");
    }

    return readTableCell(table, targetRowIndex, candidateColumn, "HLOOKUP");
  },
};

// NOTE: Shares table normalization logic with VLOOKUP via src/modules/formula/functions/lookup/table.ts.
