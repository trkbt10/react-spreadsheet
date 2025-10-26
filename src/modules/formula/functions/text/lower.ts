/**
 * @file LOWER function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const lowerFunction: FormulaFunctionEagerDefinition = {
  name: "LOWER",
  description: {
    en: "Converts text to lowercase using locale-aware rules.",
    ja: "ロケールに応じた規則で文字列を小文字に変換します。",
  },
  examples: ['LOWER("SpreadSheet")', "LOWER(A1)"],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("LOWER expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "LOWER text");
    return text.toLocaleLowerCase();
  },
};
