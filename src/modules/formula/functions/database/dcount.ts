/**
 * @file DCOUNT function implementation (ODF 1.3 §6.7.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

export const dCountFunction: FormulaFunctionEagerDefinition = {
  name: "DCOUNT",
  description: {
    en: "Counts numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値の件数を返します。",
  },
  examples: ['DCOUNT(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("DCOUNT expects exactly three arguments");
    }

    const [databaseArg, fieldArg, criteriaArg] = args;
    const database = parseDatabaseArgument(databaseArg, "DCOUNT");
    const fieldValue = helpers.coerceScalar(fieldArg, "DCOUNT field");
    const fieldIndex = resolveFieldIndex(fieldValue, database, "DCOUNT");
    const matchingRows = filterDatabaseRows(database, criteriaArg, helpers, "DCOUNT");
    const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);
    return numericValues.length;
  },
};
