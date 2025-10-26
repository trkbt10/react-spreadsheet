/**
 * @file UPPER function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const upperFunction: FormulaFunctionEagerDefinition = {
  name: "UPPER",
  description: {
    en: "Converts text to uppercase using locale-aware rules.",
    ja: "ロケールに応じた規則で文字列を大文字に変換します。",
  },
  examples: ['UPPER("Spreadsheet")', 'UPPER(A1)'],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("UPPER expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "UPPER text");
    return text.toLocaleUpperCase();
  },
};
