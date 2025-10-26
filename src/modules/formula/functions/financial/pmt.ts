/**
 * @file PMT function implementation (ODF 1.3 §6.12.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const pmtFunction: FormulaFunctionEagerDefinition = {
  name: "PMT",
  description: {
    en: "Returns the periodic payment amount for a loan or investment.",
    ja: "ローンや投資の各期支払額を計算します。",
  },
  examples: ["PMT(0.05/12, 60, 10000)", "PMT(rate, nper, pv, fv, type)"],
  evaluate: (args, helpers) => {
    if (args.length < 3 || args.length > 5) {
      throw new Error("PMT expects rate, nper, pv, and optional fv and type");
    }
    const [rateArg, nperArg, pvArg, fvArg, typeArg] = args;
    const rate = helpers.requireNumber(rateArg, "PMT rate");
    const periodsRaw = helpers.requireNumber(nperArg, "PMT nper");
    const pv = helpers.requireNumber(pvArg, "PMT pv");
    const fv = fvArg ? helpers.requireNumber(fvArg, "PMT fv") : 0;
    const typeValue = typeArg ? helpers.requireNumber(typeArg, "PMT type") : 0;
    const periods = helpers.requireInteger(periodsRaw, "PMT nper must be integer");
    const type = helpers.requireInteger(typeValue, "PMT type must be integer");
    return helpers.calculatePayment(rate, periods, pv, fv, type);
  },
};
