/**
 * @file TRIM function implementation (ODF 1.3 §6.16).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";

export const trimFunction: FormulaFunctionEagerDefinition = {
  name: "TRIM",
  description: {
    en: "Removes leading/trailing whitespace and collapses internal spaces to a single space.",
    ja: "前後の空白を削除し、内部の空白連続を1つのスペースに縮めます。",
  },
  examples: ['TRIM("  data  ")', "TRIM(A1)"],
  evaluate: (args, helpers) => {
    if (args.length !== 1) {
      throw new Error("TRIM expects exactly one argument");
    }
    const [textArg] = args;
    const text = helpers.coerceText(textArg, "TRIM text");
    return text.replace(/\s+/gu, " ").trim();
  },
};
