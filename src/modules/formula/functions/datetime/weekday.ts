/**
 * @file WEEKDAY function implementation (ODF 1.3 §6.9.12).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToDate } from "./serialDate";

const normalizeWeekday = (weekday: number, returnType: number): number => {
  if (returnType === 1) {
    return weekday === 0 ? 1 : weekday + 1;
  }
  if (returnType === 2) {
    return weekday === 0 ? 7 : weekday;
  }
  if (returnType === 3) {
    return (weekday + 6) % 7;
  }
  throw new Error("WEEKDAY return_type must be 1, 2, or 3");
};

export const weekDayFunction: FormulaFunctionEagerDefinition = {
  name: "WEEKDAY",
  description: {
    en: "Returns the day of the week for a date, with configurable numbering schemes.",
    ja: "日付の曜日を取得し、番号付け方式を指定できます。",
  },
  examples: ['WEEKDAY("2024-01-07")', "WEEKDAY(A1, 2)"],
  evaluate: (args, helpers) => {
    if (args.length < 1 || args.length > 2) {
      throw new Error("WEEKDAY expects one or two arguments");
    }
    const serial = helpers.requireNumber(args[0], "WEEKDAY serial");
    const returnType =
      args.length === 2
        ? helpers.requireInteger(
            helpers.requireNumber(args[1], "WEEKDAY return_type"),
            "WEEKDAY return_type must be integer",
          )
        : 1;

    const date = serialToDate(Math.floor(serial));
    const weekday = date.getUTCDay();
    return normalizeWeekday(weekday, returnType);
  },
};
