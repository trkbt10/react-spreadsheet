/**
 * @file ISERR function implementation (ODF 1.3 §6.15.8).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const isErrFunction: FormulaFunctionLazyDefinition = {
  name: "ISERR",
  description: {
    en: "Returns TRUE if evaluating the value results in an error other than #N/A.",
    ja: "値の評価で#N/A以外のエラーが発生した場合にTRUEを返します。",
  },
  examples: ["ISERR(1/0)", "ISERR(NOT(A1))"],
  evaluateLazy: (nodes, context) => {
    if (nodes.length !== 1) {
      throw new Error("ISERR expects exactly one argument");
    }
    try {
      context.evaluate(nodes[0]);
      return false;
    } catch (error) {
      const code = context.helpers.getErrorCode(error);
      return code !== "#N/A";
    }
  },
};
