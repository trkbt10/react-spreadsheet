/**
 * @file SUBTOTAL function implementation (ODF 1.3 §6.10.15).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";
import { aggregateValues, isSupportedAggregationFunction } from "./aggregationHelpers";

const collectValues = (
  args: FormulaEvaluationResult[][],
): FormulaEvaluationResult[] => {
  return args.flat();
};

export const subtotalFunction: FormulaFunctionEagerDefinition = {
  name: "SUBTOTAL",
  description: {
    en: "Calculates a subtotal using a selected aggregation and one or more ranges.",
    ja: "指定した集計方法で1つ以上の範囲を集計した小計を返します。",
  },
  examples: ['SUBTOTAL(9, A1:A10)', 'SUBTOTAL(1, A1:A5, B1:B5)'],
  evaluate: (args, helpers) => {
    if (args.length < 2) {
      throw new Error("SUBTOTAL expects a function number and at least one range");
    }
    const [functionNumberArg, ...rangeArgs] = args;
    const functionNumberValue = helpers.requireNumber(functionNumberArg, "SUBTOTAL function number");
    const functionNumber = helpers.requireInteger(
      functionNumberValue,
      "SUBTOTAL function number must be an integer",
    );

    if (!isSupportedAggregationFunction(functionNumber)) {
      throw new Error("SUBTOTAL function number is not supported");
    }

    const rangeValues = rangeArgs.map((rangeArg) => helpers.flattenResult(rangeArg));

    const collected = collectValues(rangeValues);
    return aggregateValues(functionNumber, collected);
  },
};
