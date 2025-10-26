/**
 * @file IF function implementation (ODF 1.3 §6.11.5).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const ifFunction: FormulaFunctionLazyDefinition = {
  name: "IF",
  description: {
    en: "Evaluates a condition and returns one value if TRUE, another if FALSE.",
    ja: "条件を評価してTRUEなら1つの値、FALSEなら別の値を返します。",
  },
  examples: ['IF(A1>0, "Positive", "Negative")', "IF(ISBLANK(A1), 0, A1)"],
  evaluateLazy: (argNodes, context) => {
    if (argNodes.length < 2 || argNodes.length > 3) {
      throw new Error("IF expects two or three arguments");
    }

    const conditionResult = context.evaluate(argNodes[0]);
    const condition = context.helpers.requireBoolean(conditionResult, "IF condition");
    if (condition) {
      return context.evaluate(argNodes[1]);
    }
    if (argNodes.length === 3) {
      return context.evaluate(argNodes[2]);
    }
    return null;
  },
};

// NOTE: Reviewed src/modules/formula/engine.ts to align lazy evaluation with existing execution flow.
