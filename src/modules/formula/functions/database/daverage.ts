/**
 * @file DAVERAGE function implementation (ODF 1.3 §6.7.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

export const dAverageFunction: FormulaFunctionEagerDefinition = {
  name: "DAVERAGE",
  description: {
    en: "Returns the mean of numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値の平均を返します。",
  },
  examples: ['DAVERAGE(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("DAVERAGE expects exactly three arguments");
    }

    const [databaseArg, fieldArg, criteriaArg] = args;
    const database = parseDatabaseArgument(databaseArg, "DAVERAGE");
    const fieldValue = helpers.coerceScalar(fieldArg, "DAVERAGE field");
    const fieldIndex = resolveFieldIndex(fieldValue, database, "DAVERAGE");
    const matchingRows = filterDatabaseRows(database, criteriaArg, helpers, "DAVERAGE");
    const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);

    if (numericValues.length === 0) {
      throw new Error("DAVERAGE found no numeric values matching criteria");
    }

    const total = numericValues.reduce((sum, value) => sum + value, 0);
    return total / numericValues.length;
  },
};
