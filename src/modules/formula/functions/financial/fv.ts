/**
 * @file FV function implementation (ODF 1.3 §6.12.2).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const fvFunction: FormulaFunctionEagerDefinition = {
  name: "FV",
  description: {
    en: "Returns the future value of an investment given rate, periods, and payments.",
    ja: "利率・期間・支払額を基に将来価値を計算します。",
  },
  examples: ["FV(0.05/12, 60, -200)", "FV(rate, nper, pmt, pv, type)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("FV expects rate, nper, payment, and optional pv and type");
    }
    const [rateArg, nperArg, paymentArg, pvArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "FV rate");
    const periodsRaw = helpers.requireNumber(nperArg, "FV nper");
    const payment = helpers.requireNumber(paymentArg, "FV payment");
    const pv = pvArg ? helpers.requireNumber(pvArg, "FV pv") : 0;
    const typeValue = typeArg ? helpers.requireNumber(typeArg, "FV type") : 0;
    const periods = helpers.requireInteger(periodsRaw, "FV nper must be integer");
    const type = helpers.requireInteger(typeValue, "FV type must be integer");

    if (periods <= 0) {
      throw new Error("FV nper must be greater than zero");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("FV type must be 0 or 1");
    }

    if (rate === 0) {
      return -(pv + payment * periods);
    }

    helpers.validateInterestRate(rate, "FV rate");
    const factor = helpers.pow1p(rate, periods);
    return -(pv * factor + (payment * (1 + rate * type) * (factor - 1)) / rate);
  },
};
