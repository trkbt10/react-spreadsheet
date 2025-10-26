/**
 * @file LOOKUP function implementation (ODF 1.3 §6.14.13).
 */

import type { FormulaFunctionEagerDefinition } from "../../functionRegistry";
import type { FormulaEvaluationResult } from "../../types";

const ensureVector = (values: FormulaEvaluationResult[], description: string): FormulaEvaluationResult[] => {
  if (values.length === 0) {
    throw new Error(`${description} vector cannot be empty`);
  }
  return values;
};

export const lookupFunction: FormulaFunctionEagerDefinition = {
  name: "LOOKUP",
  description: {
    en: "Searches for a value in a vector or array and returns the corresponding result.",
    ja: "ベクターまたは配列から値を検索し、対応する結果を返します。",
  },
  examples: ["LOOKUP(5, A1:A10, B1:B10)", 'LOOKUP("Key", A1:B2)'],
  evaluate: (args, helpers) => {
    if (args.length !== 2 && args.length !== 3) {
      throw new Error("LOOKUP expects two or three arguments");
    }

    const lookupValue = helpers.coerceScalar(args[0], "LOOKUP lookup value");
    const lookupVector = ensureVector(
      helpers.flattenResult(args[1]).map((value) => (value ?? null) as FormulaEvaluationResult),
      "LOOKUP lookup",
    );

    const resultVector =
      args.length === 3
        ? ensureVector(
            helpers.flattenResult(args[2]).map((value) => (value ?? null) as FormulaEvaluationResult),
            "LOOKUP result",
          )
        : lookupVector;

    if (resultVector.length !== lookupVector.length) {
      throw new Error("LOOKUP result vector must match lookup vector length");
    }

    const exactIndex = lookupVector.findIndex((candidate) => helpers.comparePrimitiveEquality(candidate, lookupValue));
    if (exactIndex !== -1) {
      return resultVector[exactIndex] ?? null;
    }

    if (typeof lookupValue !== "number") {
      throw new Error("LOOKUP requires numeric lookup value when no exact match is found");
    }

    let candidateIndex: number | null = null;
    for (let index = 0; index < lookupVector.length; index += 1) {
      const candidate = lookupVector[index];
      if (typeof candidate !== "number") {
        throw new Error("LOOKUP requires numeric lookup vector when performing approximate match");
      }
      if (candidate > lookupValue) {
        break;
      }
      candidateIndex = index;
    }

    if (candidateIndex === null) {
      throw new Error("LOOKUP could not find an approximate match");
    }

    return resultVector[candidateIndex] ?? null;
  },
};

// NOTE: Approximate matching logic aligns with VLOOKUP implementation in src/modules/formula/functions/lookup/vlookup.ts.
