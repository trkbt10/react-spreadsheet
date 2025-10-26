/**
 * @file DMAX/DMIN function implementations (ODF 1.3 §6.7.7, §6.7.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import {
  collectNumericFieldValues,
  filterDatabaseRows,
  parseDatabaseArgument,
  resolveFieldIndex,
} from "./common";

const evaluateExtremum = (
  args: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[0],
  helpers: Parameters<FormulaFunctionEagerDefinition["evaluate"]>[1],
  functionName: string,
  reducer: (values: number[]) => number,
  emptyErrorMessage: string,
) => {
  if (args.length !== 3) {
    throw new Error(`${functionName} expects exactly three arguments`);
  }

  const [databaseArg, fieldArg, criteriaArg] = args;
  const database = parseDatabaseArgument(databaseArg, functionName);
  const fieldValue = helpers.coerceScalar(fieldArg, `${functionName} field`);
  const fieldIndex = resolveFieldIndex(fieldValue, database, functionName);
  const matchingRows = filterDatabaseRows(database, criteriaArg, helpers, functionName);
  const numericValues = collectNumericFieldValues(matchingRows, fieldIndex);

  if (numericValues.length === 0) {
    throw new Error(emptyErrorMessage);
  }

  return reducer(numericValues);
};

export const dMaxFunction: FormulaFunctionEagerDefinition = {
  name: "DMAX",
  description: {
    en: "Returns the largest numeric entry in a database column that satisfies the criteria.",
    ja: "条件を満たすデータベース列で最大の数値を返します。",
  },
  examples: ['DMAX(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    return evaluateExtremum(
      args,
      helpers,
      "DMAX",
      (values) => Math.max(...values),
      "DMAX found no numeric values matching criteria",
    );
  },
};

export const dMinFunction: FormulaFunctionEagerDefinition = {
  name: "DMIN",
  description: {
    en: "Returns the smallest numeric entry in a database column that satisfies the criteria.",
    ja: "条件を満たすデータベース列で最小の数値を返します。",
  },
  examples: ['DMIN(A1:C10, "Sales", E1:F2)'],
  evaluate: (args, helpers) => {
    return evaluateExtremum(
      args,
      helpers,
      "DMIN",
      (values) => Math.min(...values),
      "DMIN found no numeric values matching criteria",
    );
  },
};
