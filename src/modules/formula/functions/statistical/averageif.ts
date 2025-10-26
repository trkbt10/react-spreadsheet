/**
 * @file AVERAGEIF function implementation (ODF 1.3 §6.18.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { createCriteriaPredicate } from "../helpers";

export const averageIfFunction: FormulaFunctionEagerDefinition = {
  name: "AVERAGEIF",
  description: {
    en: "Returns the mean of values that satisfy a single condition.",
    ja: "単一条件を満たす値の平均を計算します。",
  },
  examples: ['AVERAGEIF(A1:A10, ">0")', 'AVERAGEIF(A1:A10, "=East", B1:B10)'],
  evaluate: (args, helpers) => {
    if (args.length < 2 || args.length > 3) {
      throw new Error("AVERAGEIF expects two or three arguments");
    }

    const [rangeArg, criteriaArg, averageRangeArg] = args;
    const rangeValues = helpers.flattenResult(rangeArg);
    const averageValues = averageRangeArg ? helpers.flattenResult(averageRangeArg) : rangeValues;

    if (averageValues.length !== rangeValues.length) {
      throw new Error("AVERAGEIF requires average_range to match range size");
    }

    const criteria = helpers.coerceScalar(criteriaArg, "AVERAGEIF criteria");
    const predicate = createCriteriaPredicate(
      criteria,
      helpers.comparePrimitiveEquality,
      "AVERAGEIF criteria",
    );

    const aggregate = rangeValues.reduce<
      {
        sum: number;
        count: number;
      }
    >(
      (state, rangeValue, index) => {
        if (!predicate(rangeValue)) {
          return state;
        }
        const candidate = averageValues[index];
        if (typeof candidate !== "number") {
          return state;
        }
        return {
          sum: state.sum + candidate,
          count: state.count + 1,
        };
      },
      {
        sum: 0,
        count: 0,
      },
    );

    if (aggregate.count === 0) {
      throw new Error("AVERAGEIF found no numeric values matching criteria");
    }

    return aggregate.sum / aggregate.count;
  },
};

// NOTE: Mirrored COUNTIF predicate semantics defined in src/modules/formula/functions/statistical/countif.ts.
