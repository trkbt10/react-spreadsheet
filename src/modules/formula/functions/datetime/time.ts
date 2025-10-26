/**
 * @file TIME function implementation (ODF 1.3 §6.9.2).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { normalizeTimeToFraction } from "./serialDate";

export const timeFunction: FormulaFunctionEagerDefinition = {
  name: "TIME",
  description: {
    en: "Converts hour, minute, and second arguments into a fractional-day time serial.",
    ja: "時・分・秒を1日を基準とした時間シリアル値に変換します。",
  },
  examples: ['TIME(14, 30, 0)', 'TIME(A1, B1, C1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("TIME expects exactly three arguments");
    }

    const hours = helpers.requireNumber(args[0], "TIME hour");
    const minutes = helpers.requireNumber(args[1], "TIME minute");
    const seconds = helpers.requireNumber(args[2], "TIME second");

    if (minutes < 0 || seconds < 0) {
      throw new Error("TIME arguments must not be negative");
    }

    return normalizeTimeToFraction(hours, minutes, seconds);
  },
};
