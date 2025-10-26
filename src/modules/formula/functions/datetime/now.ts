/**
 * @file NOW function implementation (ODF 1.3 §6.9.6).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { dateTimeToSerial } from "./serialDate";

export const nowFunction: FormulaFunctionEagerDefinition = {
  name: "NOW",
  evaluate: (args) => {
    if (args.length !== 0) {
      throw new Error("NOW expects no arguments");
    }
    return dateTimeToSerial(new Date());
  },
};

