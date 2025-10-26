/**
 * @file IFS function implementation (ODF 1.3 §6.11.6).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

export const ifsFunction: FormulaFunctionLazyDefinition = {
  name: "IFS",
  description: {
    en: "Evaluates multiple condition/value pairs and returns the first match.",
    ja: "複数の条件と結果の組を順に評価し、最初に成り立った結果を返します。",
  },
  examples: ['IFS(A1>0, "Positive", A1<0, "Negative", TRUE, "Zero")'],
  evaluateLazy: (argNodes, context) => {
    if (argNodes.length < 2 || argNodes.length % 2 !== 0) {
      throw new Error("IFS expects condition/value pairs");
    }

    for (let index = 0; index < argNodes.length; index += 2) {
      const conditionNode = argNodes[index];
      const valueNode = argNodes[index + 1];
      const conditionResult = context.evaluate(conditionNode);
      const condition = context.helpers.requireBoolean(
        conditionResult,
        `IFS condition ${index / 2 + 1}`,
      );
      if (condition) {
        return context.evaluate(valueNode);
      }
    }

    throw new Error("IFS requires at least one matching condition");
  },
};

// NOTE: Compared behaviour with src/modules/formula/functions/logical/if.ts to ensure consistent condition handling.
