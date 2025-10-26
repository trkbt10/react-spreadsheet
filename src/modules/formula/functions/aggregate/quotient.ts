/**
 * @file QUOTIENT function implementation (ODF 1.3 §6.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeZero } from "../helpers";

const truncateTowardZero = (value: number): number => {
  const truncated = value < 0 ? Math.ceil(value) : Math.floor(value);
  return truncated;
};

export const quotientFunction: FormulaFunctionEagerDefinition = {
  name: "QUOTIENT",
  description: {
    en: "Returns the integer portion of a division, truncating toward zero.",
    ja: "除算の結果をゼロ方向に切り捨てた整数部分を返します。",
  },
  examples: ['QUOTIENT(10, 3)', 'QUOTIENT(A1, B1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("QUOTIENT expects exactly two arguments");
    }
    const [dividendArg, divisorArg] = args;
    const dividend = helpers.requireNumber(dividendArg, "QUOTIENT dividend");
    const divisor = helpers.requireNumber(divisorArg, "QUOTIENT divisor");

    if (!Number.isFinite(dividend) || !Number.isFinite(divisor)) {
      throw new Error("QUOTIENT expects finite numeric arguments");
    }
    if (divisor === 0) {
      throw new Error("QUOTIENT divisor must be non-zero");
    }

    const quotient = truncateTowardZero(dividend / divisor);
    return normalizeZero(quotient);
  },
};
