/**
 * @file NOW function implementation (ODF 1.3 §6.9.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { dateTimeToSerial } from "./serialDate";

export const nowFunction: FormulaFunctionEagerDefinition = {
  name: "NOW",
  description: {
    en: "Returns the current date and time as a serial number.",
    ja: "現在の日付と時刻をシリアル値で返します。",
  },
  examples: ['NOW()'],
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("NOW expects no arguments");
    }
    return dateTimeToSerial(new Date());
  },
};
