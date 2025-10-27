/**
 * @file Data utilities for formula function suggestions.
 */

import { listFormulaFunctions, type FormulaFunctionDefinition } from "../../../../modules/formula/functionRegistry";
import type { FormulaFunctionSuggestion } from "./types";
import { MAX_FORMULA_SUGGESTIONS } from "./types";

export const loadFormulaSuggestions = (): FormulaFunctionSuggestion[] => {
  const definitions: FormulaFunctionDefinition[] = listFormulaFunctions();
  return definitions
    .map((definition: FormulaFunctionDefinition) => {
      const description = definition.description?.ja ?? definition.description?.en ?? undefined;
      const rawExample = definition.examples?.[0];
      const example = rawExample ? (rawExample.startsWith("=") ? rawExample : `=${rawExample}`) : undefined;
      return {
        name: definition.name,
        description,
        example,
      } satisfies FormulaFunctionSuggestion;
    })
    .sort((left: FormulaFunctionSuggestion, right: FormulaFunctionSuggestion) => {
      return left.name.localeCompare(right.name);
    });
};

export const filterFormulaSuggestions = (
  suggestions: FormulaFunctionSuggestion[],
  query: string | null,
): FormulaFunctionSuggestion[] => {
  if (query === null) {
    return [] satisfies FormulaFunctionSuggestion[];
  }
  if (query === "") {
    return suggestions.slice(0, MAX_FORMULA_SUGGESTIONS);
  }
  const matches = suggestions.filter((suggestion) => {
    return suggestion.name.startsWith(query);
  });
  return matches.slice(0, MAX_FORMULA_SUGGESTIONS);
};

/**
 * Notes:
 * - Pulls metadata straight from the function registry to ensure suggestions remain canonical.
 */
