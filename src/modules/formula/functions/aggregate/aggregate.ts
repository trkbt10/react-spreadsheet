/**
 * @file AGGREGATE function implementation (ODF 1.3 §6.10.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import { aggregateValues, isSupportedAggregationFunction } from "./aggregationHelpers";

const collectValues = (
  args: FormulaEvaluationResult[][],
): FormulaEvaluationResult[] => {
  return args.flat();
};

const SUPPORTED_OPTION_VALUES = new Set([0, 6]);

export const aggregateFunction: FormulaFunctionEagerDefinition = {
  name: "AGGREGATE",
  description: {
    en: "Performs a selected aggregation with options for skipping hidden or error cells.",
    ja: "非表示セルやエラーを除外するオプション付きで集計を実行します。",
  },
  examples: ['AGGREGATE(9, 0, A1:A10)', 'AGGREGATE(1, 6, A1:A5, B1:B5)'],
  evaluate: (args, helpers) => {
    if (args.length < 3) {
      throw new Error("AGGREGATE expects a function number, options, and at least one range");
    }

    const [functionNumberArg, optionsArg, ...rangeArgs] = args;
    const fnNumberValue = helpers.requireNumber(functionNumberArg, "AGGREGATE function number");
    const fnNumber = helpers.requireInteger(
      fnNumberValue,
      "AGGREGATE function number must be an integer",
    );

    if (!isSupportedAggregationFunction(fnNumber)) {
      throw new Error("AGGREGATE function number is not supported");
    }

    const optionsValue = helpers.requireNumber(optionsArg, "AGGREGATE options");
    const options = helpers.requireInteger(optionsValue, "AGGREGATE options must be an integer");
    if (!SUPPORTED_OPTION_VALUES.has(options)) {
      throw new Error("AGGREGATE options value is not supported");
    }

    if (rangeArgs.length === 0) {
      throw new Error("AGGREGATE expects at least one range argument");
    }

    const rangeValues = rangeArgs.map((rangeArg) => helpers.flattenResult(rangeArg));
    const collected = collectValues(rangeValues);

    return aggregateValues(fnNumber, collected);
  },
};
