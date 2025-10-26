/**
 * @file TIMEVALUE function implementation (ODF 1.3 §6.9.4).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { parseTimeText } from "./parseDateText";

export const timeValueFunction: FormulaFunctionEagerDefinition = {
  name: "TIMEVALUE",
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("TIMEVALUE expects exactly one argument");
    }
    const value = helpers.coerceScalar(args[0], "TIMEVALUE input");
    if (typeof value === "number") {
      const fraction = value - Math.floor(value);
      return fraction >= 0 ? fraction : fraction + 1;
    }
    if (typeof value === "string") {
      return parseTimeText(value, "TIMEVALUE input");
    }
    throw new Error("TIMEVALUE expects a time serial or text representation");
  },
};

