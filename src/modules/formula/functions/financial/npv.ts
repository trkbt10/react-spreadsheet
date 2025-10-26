/**
 * @file NPV function implementation (ODF 1.3 §6.12.7).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const npvFunction: FormulaFunctionEagerDefinition = {
  name: "NPV",
  description: {
    en: "Returns the net present value of cash flows given a discount rate.",
    ja: "指定した割引率でキャッシュフローの正味現在価値を計算します。",
  },
  examples: ["NPV(0.1, -10000, 3000, 4200, 6800)", "NPV(rate, values)"],
  evaluate: (args, helpers) => {
    if (args.length < 2) {
      throw new Error("NPV expects at least a rate and one cash flow");
    }
    const [rateArg, ...cashflowArgs] = args;
    const rate = helpers.requireNumber(rateArg, "NPV rate");
    const flattened = cashflowArgs.flatMap((arg, index) => {
      return helpers.flattenResult(arg).map((value) => {
        if (typeof value !== "number") {
          throw new Error(`NPV cash flow ${index + 1} must be numeric`);
        }
        return value;
      });
    });
    if (flattened.length === 0) {
      throw new Error("NPV requires at least one numeric cash flow");
    }
    return helpers.computeNPV(rate, flattened);
  },
};
