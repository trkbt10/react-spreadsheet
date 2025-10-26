/**
 * @file SUMIFS function implementation (ODF 1.3 §6.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";

type CriteriaRange = {
  values: FormulaEvaluationResult[];
  predicate: (value: FormulaEvaluationResult) => boolean;
};

export const sumIfsFunction: FormulaFunctionEagerDefinition = {
  name: "SUMIFS",
  description: {
    en: "Sums values that satisfy multiple range/criteria pairs.",
    ja: "複数の範囲と条件をすべて満たす値を合計します。",
  },
  examples: ['SUMIFS(C1:C10, A1:A10, "East", B1:B10, ">=2024")', "SUMIFS(A1:A5, B1:B5, 1)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length % 2 === 0) {
      throw new Error("SUMIFS expects a sum range followed by range/criteria pairs");
    }
    const [sumRangeArg, ...criteriaArgs] = args;
    const sumValues = helpers.flattenResult(sumRangeArg);
    if (sumValues.length === 0) {
      return 0;
    }

    const criteriaRanges: CriteriaRange[] = [];
    for (let index = 0; index < criteriaArgs.length; index += 2) {
      const rangeArg = criteriaArgs[index];
      const criteriaArg = criteriaArgs[index + 1];
      const rangeValues = helpers.flattenResult(rangeArg);
      if (rangeValues.length !== sumValues.length) {
        throw new Error("SUMIFS criteria ranges must match the sum range size");
      }
      const criteriaValue = helpers.coerceScalar(criteriaArg, `SUMIFS criteria ${index / 2 + 1}`);
      const predicate = helpers.createCriteriaPredicate(
        criteriaValue,
        helpers.comparePrimitiveEquality,
        `SUMIFS criteria ${index / 2 + 1}`,
      );
      criteriaRanges.push({
        values: rangeValues,
        predicate,
      });
    }

    return sumValues.reduce<number>((total, value, valueIndex) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return total;
      }
      const matchesAll = criteriaRanges.every(({ values, predicate }) => predicate(values[valueIndex]));
      if (!matchesAll) {
        return total;
      }
      return total + value;
    }, 0);
  },
};
