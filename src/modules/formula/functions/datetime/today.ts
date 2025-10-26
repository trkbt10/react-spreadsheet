/**
 * @file TODAY function implementation (ODF 1.3 §6.9.5).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { dateTimeToSerial } from "./serialDate";

export const todayFunction: FormulaFunctionEagerDefinition = {
  name: "TODAY",
  description: {
    en: "Returns the current date as a serial number without a time component.",
    ja: "現在の日付を時間成分なしのシリアル値で返します。",
  },
  examples: ["TODAY()"],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("TODAY expects no arguments");
    }
    const now = new Date();
    return Math.floor(dateTimeToSerial(now));
  },
};
