/**
 * @file DAY function implementation (ODF 1.3 §6.9.9).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const dayFunction: FormulaFunctionEagerDefinition = {
  name: "DAY",
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("DAY expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "DAY serial");
    return serialToUTCComponents(Math.floor(serial)).day;
  },
};

