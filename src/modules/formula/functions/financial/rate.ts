/**
 * @file RATE function implementation (ODF 1.3 §6.12.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { FINANCE_EPSILON, FINANCE_MAX_ITERATIONS } from "../helpers";

const evaluateBalance = (
  rate: number,
  periods: number,
  payment: number,
  pv: number,
  fv: number,
  type: number,
): number => {
  if (rate === 0) {
    return pv + payment * periods + fv;
  }
  const factor = (1 + rate) ** periods;
  return pv * factor + (payment * (1 + rate * type) * (factor - 1)) / rate + fv;
};

export const rateFunction: FormulaFunctionEagerDefinition = {
  name: "RATE",
  description: {
    en: "Returns the interest rate per period for an annuity.",
    ja: "年金の各期利率を算出します。",
  },
  examples: ["RATE(60, -188.71, 10000)", "RATE(nper, pmt, pv, fv, type, guess)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 6) {
      throw new Error("RATE expects nper, payment, pv, and optional fv, type, guess");
    }
    const [nperArg, paymentArg, pvArg, fvArg, typeArg, guessArg] = args;
    const periodsRaw = helpers.requireNumber(nperArg, "RATE nper");
    const payment = helpers.requireNumber(paymentArg, "RATE payment");
    const pv = helpers.requireNumber(pvArg, "RATE pv");
    const fv = fvArg ? helpers.requireNumber(fvArg, "RATE fv") : 0;
    const typeNumber = typeArg ? helpers.requireNumber(typeArg, "RATE type") : 0;
    const guess = guessArg ? helpers.requireNumber(guessArg, "RATE guess") : 0.1;

    const periods = helpers.requireInteger(periodsRaw, "RATE nper must be integer");
    const type = helpers.requireInteger(typeNumber, "RATE type must be integer");

    if (periods <= 0) {
      throw new Error("RATE nper must be greater than zero");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("RATE type must be 0 or 1");
    }

    let rate = guess <= -0.999999 ? -0.999999 : guess;
    const delta = 1e-6;

    for (let iteration = 0; iteration < FINANCE_MAX_ITERATIONS; iteration += 1) {
      const value = evaluateBalance(rate, periods, payment, pv, fv, type);
      if (Math.abs(value) <= FINANCE_EPSILON) {
        return rate;
      }

      const forward = evaluateBalance(rate + delta, periods, payment, pv, fv, type);
      const backward = evaluateBalance(rate - delta, periods, payment, pv, fv, type);
      const derivative = (forward - backward) / (2 * delta);

      if (!Number.isFinite(derivative) || Math.abs(derivative) <= FINANCE_EPSILON) {
        break;
      }

      let nextRate = rate - value / derivative;
      if (nextRate <= -0.9999999999) {
        nextRate = -0.9999999999;
      }
      if (Math.abs(nextRate - rate) <= FINANCE_EPSILON) {
        return nextRate;
      }
      rate = nextRate;
    }

    throw new Error("RATE did not converge");
  },
};
