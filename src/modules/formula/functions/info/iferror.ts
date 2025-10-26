/**
 * @file IFERROR function implementation (ODF 1.3 §6.15.10).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const ifErrorFunction: FormulaFunctionLazyDefinition = {
  name: "IFERROR",
  description: {
    en: "Returns an alternative value if an error occurs; otherwise returns the original result.",
    ja: "エラーが発生した場合は代替値を返し、そうでなければ元の結果を返します。",
  },
  examples: ['IFERROR(1/0, 0)', 'IFERROR(VLOOKUP("x", A1:B2, 2, FALSE), "Not found")'],
  evaluateLazy: (nodes, context) => {
    if (nodes.length < 1 || nodes.length > 2) {
      throw new Error("IFERROR expects one or two arguments");
    }
    try {
      return context.evaluate(nodes[0]);
    } catch (error) {
      if (nodes.length === 1) {
        return null;
      }
      return context.evaluate(nodes[1]);
    }
  },
};
