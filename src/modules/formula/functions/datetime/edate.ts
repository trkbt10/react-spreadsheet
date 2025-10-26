/**
 * @file EDATE function implementation (ODF 1.3 §6.9.7).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial, serialToDate } from "./serialDate";
import { coerceDateSerial } from "./coerceDateSerial";

export const eDateFunction: FormulaFunctionEagerDefinition = {
  name: "EDATE",
  evaluate: (args, helpers) => {
    if (args.length !== 2) {
      throw new Error("EDATE expects exactly two arguments");
    }
    const baseSerial = coerceDateSerial(args[0], helpers, "EDATE start_date");
    const monthsRaw = helpers.requireNumber(args[1], "EDATE months");
    const monthsOffset = helpers.requireInteger(monthsRaw, "EDATE months must be integer");

    const baseDate = serialToDate(baseSerial);
    const target = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + monthsOffset, baseDate.getUTCDate()));
    return datePartsToSerial(
      target.getUTCFullYear(),
      target.getUTCMonth() + 1,
      target.getUTCDate(),
    );
  },
};
