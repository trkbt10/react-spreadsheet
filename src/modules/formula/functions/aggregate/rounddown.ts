/**
 * @file ROUNDDOWN function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { computePowerOfTen, normalizeZero, requireInteger } from "../helpers";

const roundDownToDigits = (value: number, digits: number): number => {
  if (value === 0) {
    return 0;
  }
  if (digits === 0) {
    return value > 0 ? Math.floor(value) : Math.ceil(value);
  }
  if (digits > 0) {
    const factor = computePowerOfTen(digits, "ROUNDDOWN digits magnitude is too large");
    const scaled = value * factor;
    const rounded = value > 0 ? Math.floor(scaled) : Math.ceil(scaled);
    return rounded / factor;
  }
  const divisor = computePowerOfTen(-digits, "ROUNDDOWN digits magnitude is too large");
  const scaled = value / divisor;
  const rounded = value > 0 ? Math.floor(scaled) : Math.ceil(scaled);
  return rounded * divisor;
};

export const roundDownFunction: FormulaFunctionEagerDefinition = {
  name: "ROUNDDOWN",
  description: {
    en: "Rounds a number toward zero to the specified number of digits.",
    ja: "数値をゼロ方向へ切り下げて指定桁に揃えます。",
  },
  examples: ["ROUNDDOWN(1.29, 1)", "ROUNDDOWN(A1, -1)"],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("ROUNDDOWN expects exactly two arguments");
    }
    const [valueArg, digitsArg] = args;
    const value = helpers.requireNumber(valueArg, "ROUNDDOWN number");
    const digits = helpers.requireNumber(digitsArg, "ROUNDDOWN digits");
    const normalizedDigits = requireInteger(digits, "ROUNDDOWN digits must be an integer");
    const rounded = roundDownToDigits(value, normalizedDigits);
    return normalizeZero(rounded);
  },
};
