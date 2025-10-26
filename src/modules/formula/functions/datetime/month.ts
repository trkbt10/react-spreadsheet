/**
 * @file MONTH function implementation (ODF 1.3 §6.9.10).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const monthFunction: FormulaFunctionEagerDefinition = {
  name: "MONTH",
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("MONTH expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "MONTH serial");
    return serialToUTCComponents(Math.floor(serial)).month;
  },
};

