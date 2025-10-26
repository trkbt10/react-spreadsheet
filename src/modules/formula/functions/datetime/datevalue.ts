/**
 * @file DATEVALUE function implementation (ODF 1.3 §6.9.3).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import { parseDateText } from "./parseDateText";

export const dateValueFunction: FormulaFunctionEagerDefinition = {
  name: "DATEVALUE",
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("DATEVALUE expects exactly one argument");
    }
    const value = helpers.coerceScalar(args[0], "DATEVALUE input");
    if (typeof value === "number") {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      return parseDateText(value, "DATEVALUE input");
    }
    throw new Error("DATEVALUE expects a date serial or text representation");
  },
};

