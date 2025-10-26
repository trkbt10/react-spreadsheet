/**
 * @file TRANSPOSE function implementation (ODF 1.3 §6.17.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { toLookupTable } from "../lookup/table";
import { isArrayResult } from "../helpers";

export const transposeFunction: FormulaFunctionEagerDefinition = {
  name: "TRANSPOSE",
  description: {
    en: "Returns the transpose of an array.",
    ja: "配列の転置を返します。",
  },
  examples: ["TRANSPOSE({1,2,3})", "TRANSPOSE(A1:C2)"],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("TRANSPOSE expects exactly one argument");
    }
    const source = args[0];
    if (!isArrayResult(source)) {
      return helpers.coerceScalar(source, "TRANSPOSE value");
    }
    const table = toLookupTable(source, "TRANSPOSE");
    const rowCount = table.length;
    const columnCount = table[0]?.length ?? 0;
    if (columnCount === 0) {
      throw new Error("TRANSPOSE range cannot be empty");
    }
    return Array.from({ length: columnCount }, (_, columnIndex) => {
      return Array.from({ length: rowCount }, (_, rowIndex) => {
        return table[rowIndex]?.[columnIndex] ?? null;
      });
    });
  },
};
