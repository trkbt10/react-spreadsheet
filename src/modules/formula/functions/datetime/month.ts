/**
 * @file MONTH function implementation (ODF 1.3 §6.9.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const monthFunction: FormulaFunctionEagerDefinition = {
  name: "MONTH",
  description: {
    en: "Returns the month number from a serial date (1–12).",
    ja: "シリアル日付から月番号(1〜12)を返します。",
  },
  examples: ['MONTH("2024-05-10")', "MONTH(A1)"],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("MONTH expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "MONTH serial");
    return serialToUTCComponents(Math.floor(serial)).month;
  },
};
