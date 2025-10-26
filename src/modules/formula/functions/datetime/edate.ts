/**
 * @file EDATE function implementation (ODF 1.3 §6.9.7).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial, daysInMonth, serialToUTCComponents } from "./serialDate";
import { coerceDateSerial } from "./coerceDateSerial";

export const eDateFunction: FormulaFunctionEagerDefinition = {
  name: "EDATE",
  description: {
    en: "Returns the serial number of the date that is the indicated number of months before or after a start date.",
    ja: "開始日から指定した月数だけ前後した日付のシリアル値を返します。",
  },
  examples: ['EDATE("2024-01-31", 1)', 'EDATE(A1, -6)'],
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("EDATE expects exactly two arguments");
    }
    const baseSerial = coerceDateSerial(args[0], helpers, "EDATE start_date");
    const monthsRaw = helpers.requireNumber(args[1], "EDATE months");
    const monthsOffset = helpers.requireInteger(monthsRaw, "EDATE months must be integer");

    const { year: baseYear, month: baseMonth, day: baseDay } = serialToUTCComponents(baseSerial);
    const totalMonths = baseYear * 12 + (baseMonth - 1) + monthsOffset;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonthIndex = totalMonths - targetYear * 12;
    const targetMonth = targetMonthIndex + 1;
    const clampedDay = Math.min(baseDay, daysInMonth(targetYear, targetMonth));
    return datePartsToSerial(targetYear, targetMonth, clampedDay);
  },
};
