/**
 * @file IRR function implementation (ODF 1.3 §6.12.8).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { FINANCE_EPSILON, FINANCE_MAX_ITERATIONS } from "../helpers";

const hasOpposingSigns = (values: number[]): boolean => {
  let hasPositive = false;
  let hasNegative = false;
  for (const value of values) {
    if (value > 0) {
      hasPositive = true;
    } else if (value < 0) {
      hasNegative = true;
    }
    if (hasPositive && hasNegative) {
      return true;
    }
  }
  return false;
};

const evaluateDiscountedSeries = (
  helpers: Parameters<typeof irrFunction.evaluate>[1],
  rate: number,
  values: number[],
): number => {
  return helpers.discountSeries(rate, values);
};

export const irrFunction: FormulaFunctionEagerDefinition = {
  name: "IRR",
  category: "financial",
  description: {
    en: "Returns the internal rate of return for a series of cash flows.",
    ja: "キャッシュフロー列の内部収益率を返します。",
  },
  examples: ["IRR({-10000,3000,4200,6800})", "IRR(values, guess)"],
  samples: [
    {
      input: "IRR([-10000, 3000, 4200, 6800])",
      output: 0.2343,
      description: {
        en: "IRR for investment with initial outlay and three returns",
        ja: "初期支出と3回のリターンがある投資のIRR",
      },
    },
    {
      input: "IRR([-50000, 10000, 15000, 20000, 25000])",
      output: 0.1851,
      description: {
        en: "IRR for multi-period investment",
        ja: "複数期間の投資のIRR",
      },
    },
    {
      input: "IRR([-100, 50, 60, 70], 0.1)",
      output: 0.3425,
      description: {
        en: "IRR with initial guess",
        ja: "初期推定値を指定したIRR",
      },
    },
  ],
  evaluate: (args, helpers) => {
    if (args.length < 1 || args.length > 2) {
      throw new Error("IRR expects values and an optional guess");
    }
    const valuesArg = args[0];
    const values = helpers.flattenResult(valuesArg).map((value, index) => {
      if (typeof value !== "number") {
        throw new Error(`IRR cash flow ${index + 1} must be numeric`);
      }
      return value;
    });
    if (values.length < 2) {
      throw new Error("IRR requires at least two cash flows");
    }
    if (!hasOpposingSigns(values)) {
      throw new Error("IRR requires cash flows with opposing signs");
    }

    const guess = args.length === 2 ? helpers.requireNumber(args[1], "IRR guess") : 0.1;
    let rate = guess <= -0.999999 ? -0.999999 : guess;
    const delta = 1e-6;

    for (let iteration = 0; iteration < FINANCE_MAX_ITERATIONS; iteration += 1) {
      const npv = evaluateDiscountedSeries(helpers, rate, values);
      if (Math.abs(npv) <= FINANCE_EPSILON) {
        return rate;
      }

      const forward = evaluateDiscountedSeries(helpers, rate + delta, values);
      const backward = evaluateDiscountedSeries(helpers, rate - delta, values);
      const derivative = (forward - backward) / (2 * delta);

      if (!Number.isFinite(derivative) || Math.abs(derivative) <= FINANCE_EPSILON) {
        break;
      }

      let nextRate = rate - npv / derivative;
      if (nextRate <= -0.9999999999) {
        nextRate = -0.9999999999;
      }

      if (Math.abs(nextRate - rate) <= FINANCE_EPSILON) {
        return nextRate;
      }

      rate = nextRate;
    }

    throw new Error("IRR did not converge");
  },
};
