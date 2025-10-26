/**
 * @file DATE function implementation (ODF 1.3 §6.9.1).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { datePartsToSerial } from "./serialDate";

export const dateFunction: FormulaFunctionEagerDefinition = {
  name: "DATE",
  evaluate: (args, helpers) => {
    if (args.length !== 3) {
      throw new Error("DATE expects exactly three arguments");
    }

    const yearNumber = helpers.requireNumber(args[0], "DATE year");
    const monthNumber = helpers.requireNumber(args[1], "DATE month");
    const dayNumber = helpers.requireNumber(args[2], "DATE day");

    const year = helpers.requireInteger(yearNumber, "DATE year must be integer");
    const month = helpers.requireInteger(monthNumber, "DATE month must be integer");
    const day = helpers.requireInteger(dayNumber, "DATE day must be integer");

    return datePartsToSerial(year, month, day);
  },
};
