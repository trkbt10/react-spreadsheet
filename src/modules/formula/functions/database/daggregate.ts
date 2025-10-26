/**
 * @file DSUM/DPRODUCT function implementations (ODF 1.3 §6.7.2, §6.7.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

const prepareNumericValues = (
  args: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[0],
  helpers: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[1],
  functionName: string,
) => {
  if (args.length !== 3) {
    throw new Error(`${functionName} expects exactly three arguments`);
  }

  const [databaseArg, fieldArg, criteriaArg] = args;
  const database = parseDatabaseArgument(databaseArg, functionName);
  const fieldValue = helpers.coerceScalar(fieldArg, `${functionName} field`);
  const fieldIndex = resolveFieldIndex(fieldValue, database, functionName);
  const matchingRows = filterDatabaseRows(database, criteriaArg, helpers, functionName);
  return collectNumericFieldValues(matchingRows, fieldIndex);
};

export const dSumFunction: FormulaFunctionEagerDefinition = {
  name: "DSUM",
  description: {
    en: "Sums numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値を合計します。",
  },
  examples: ['DSUM(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    const values = prepareNumericValues(args, helpers, "DSUM");
    return values.reduce((total, value) => total + value, 0);
  },
};

export const dProductFunction: FormulaFunctionEagerDefinition = {
  name: "DPRODUCT",
  description: {
    en: "Multiplies numeric entries in a database column that satisfy the criteria.",
    ja: "条件を満たすデータベース列の数値を掛け合わせます。",
  },
  examples: ['DPRODUCT(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    const values = prepareNumericValues(args, helpers, "DPRODUCT");
    return values.reduce((product, value) => product * value, 1);
  },
};
