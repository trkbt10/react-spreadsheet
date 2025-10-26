/**
 * @file SUMIF function implementation (ODF 1.3 §6.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const sumIfFunction: FormulaFunctionEagerDefinition = {
  name: "SUMIF",
  description: {
    en: "Sums values that meet a single condition across a range.",
    ja: "範囲内で条件を満たす値を合計します。",
  },
  examples: ['SUMIF(A1:A10, ">0")', 'SUMIF(A1:A10, "=East", B1:B10)'],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("SUMIF expects two or three arguments");
    }
    const [rangeArg, criteriaArg, sumRangeArg] = args;
    const rangeValues = helpers.flattenResult(rangeArg);
    const criteria = helpers.coerceScalar(criteriaArg, "SUMIF criteria");
    const predicate = helpers.createCriteriaPredicate(criteria, helpers.comparePrimitiveEquality, "SUMIF criteria");

    const sumValues = sumRangeArg === undefined ? rangeValues : helpers.flattenResult(sumRangeArg);
    if (sumRangeArg !== undefined && sumValues.length !== rangeValues.length) {
      throw new Error("SUMIF sum_range must match criteria range size");
    }

    return rangeValues.reduce<number>((total, value, index) => {
      if (!predicate(value)) {
        return total;
      }
      const sumValue = sumValues[index];
      if (typeof sumValue !== "number" || Number.isNaN(sumValue)) {
        return total;
      }
      return total + sumValue;
    }, 0);
  },
};
