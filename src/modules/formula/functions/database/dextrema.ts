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
  category: "database",
  description: {
    en: "Returns the largest numeric entry in a database column that satisfies the criteria.",
    ja: "条件を満たすデータベース列で最大の数値を返します。",
  },
  examples: ['DMAX(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DMAX([["Name", "Age"], ["Alice", 25], ["Bob", 30], ["Carol", 35]], "Age", [["Age"], [">20"]])',
      output: 35,
      description: {
        en: "Maximum age where Age > 20 (returns 35)",
        ja: "年齢が20より大きい最大値（35を返す）",
      },
    },
    {
      input: 'DMAX([["Product", "Price"], ["A", 100], ["B", 200], ["C", 150]], "Price", [["Price"], ["<200"]])',
      output: 150,
      description: {
        en: "Maximum price where Price < 200 (returns 150)",
        ja: "価格が200未満の最大値（150を返す）",
      },
    },
    {
      input: 'DMAX([["Item", "Qty"], ["X", 10], ["Y", 20], ["Z", 30]], "Qty", [["Qty"], [">=10"]])',
      output: 30,
      description: {
        en: "Maximum quantity where Qty >= 10 (returns 30)",
        ja: "数量が10以上の最大値（30を返す）",
      },
    },
  ],
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
  category: "database",
  description: {
    en: "Returns the smallest numeric entry in a database column that satisfies the criteria.",
    ja: "条件を満たすデータベース列で最小の数値を返します。",
  },
  examples: ['DMIN(A1:C10, "Sales", E1:F2)'],
  samples: [
    {
      input: 'DMIN([["Name", "Age"], ["Alice", 25], ["Bob", 30], ["Carol", 35]], "Age", [["Age"], [">20"]])',
      output: 25,
      description: {
        en: "Minimum age where Age > 20 (returns 25)",
        ja: "年齢が20より大きい最小値（25を返す）",
      },
    },
    {
      input: 'DMIN([["Product", "Price"], ["A", 100], ["B", 200], ["C", 150]], "Price", [["Price"], [">100"]])',
      output: 150,
      description: {
        en: "Minimum price where Price > 100 (returns 150)",
        ja: "価格が100より大きい最小値（150を返す）",
      },
    },
    {
      input: 'DMIN([["Item", "Qty"], ["X", 10], ["Y", 20], ["Z", 30]], "Qty", [["Qty"], [">=10"]])',
      output: 10,
      description: {
        en: "Minimum quantity where Qty >= 10 (returns 10)",
        ja: "数量が10以上の最小値（10を返す）",
      },
    },
  ],
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
