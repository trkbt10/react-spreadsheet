/**
 * @file YEAR function implementation (ODF 1.3 §6.9.11).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { serialToUTCComponents } from "./serialDate";

export const yearFunction: FormulaFunctionEagerDefinition = {
  name: "YEAR",
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("YEAR expects exactly one argument");
    }
    const serial = helpers.requireNumber(args[0], "YEAR serial");
    return serialToUTCComponents(Math.floor(serial)).year;
  },
};

