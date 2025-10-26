/**
 * @file PV function implementation (ODF 1.3 §6.12.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const pvFunction: FormulaFunctionEagerDefinition = {
  name: "PV",
  description: {
    en: "Returns the present value of an investment given rate, periods, and payment details.",
    ja: "利率・期間・支払条件から投資の現在価値を計算します。",
  },
  examples: ["PV(0.05/12, 60, -200)", "PV(rate, nper, pmt, fv, type)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("PV expects rate, nper, payment, and optional future value and type");
    }

    const [rateArg, nperArg, paymentArg, futureValueArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "PV rate");
    const periodsNumber = helpers.requireNumber(nperArg, "PV nper");
    const payment = helpers.requireNumber(paymentArg, "PV payment");
    const futureValue = futureValueArg ? helpers.requireNumber(futureValueArg, "PV future_value") : 0;
    const typeNumber = typeArg ? helpers.requireNumber(typeArg, "PV type") : 0;
    const periods = helpers.requireInteger(periodsNumber, "PV nper must be integer");
    const type = helpers.requireInteger(typeNumber, "PV type must be integer");

    if (periods <= 0) {
      throw new Error("PV nper must be greater than zero");
    }
    if (type !== 0 && type !== 1) {
      throw new Error("PV type must be 0 or 1");
    }

    if (rate === 0) {
      return -(payment * periods + futureValue);
    }

    helpers.validateInterestRate(rate, "PV rate");
    const rateFactor = helpers.pow1p(rate, periods);
    return -((payment * (1 + rate * type) * (rateFactor - 1)) / rate + futureValue * rateFactor) / rateFactor;
  },
};
