/**
 * @file INDIRECT function implementation (ODF 1.3 §6.14.11).
 */

import type { FormulaFunctionLazyDefinition } from "../../functionRegistry";

const splitRangeReference = (text: string): { start: string; end: string | null } => {
  let inQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "'") {
      const next = text[index + 1];
      if (next === "'") {
        index += 1;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (character === ":" && !inQuote) {
      return {
        start: text.slice(0, index).trim(),
        end: text.slice(index + 1).trim(),
      };
    }
  }
  return {
    start: text.trim(),
    end: null,
  };
};

const resolveReferenceText = (
  referenceText: string,
  context: Parameters<FormulaFunctionLazyDefinition["evaluateLazy"]>[1],
) => {
  const { start, end } = splitRangeReference(referenceText);
  if (!start) {
    throw new Error("INDIRECT reference_text cannot be empty");
  }

  if (!end) {
    return {
      type: "Reference" as const,
      address: context.parseReference(start),
    };
  }

  const sheetPrefix = (() => {
    const marker = start.lastIndexOf("!");
    if (marker === -1) {
      return null;
    }
    return start.slice(0, marker + 1);
  })();

  const endReferenceText = end.includes("!")
    ? end
    : sheetPrefix
      ? `${sheetPrefix}${end}`
      : end;

  return {
    type: "Range" as const,
    start: context.parseReference(start),
    end: context.parseReference(endReferenceText),
  };
};

export const indirectFunction: FormulaFunctionLazyDefinition = {
  name: "INDIRECT",
  description: {
    en: "Returns a reference specified by text, allowing dynamic ranges.",
    ja: "文字列で指定した参照を返し、動的な範囲指定を可能にします。",
  },
  examples: ["INDIRECT(\"A1\")", "INDIRECT(\"Sheet2!B3\")"],
  evaluateLazy: (args, context) => {
    if (args.length !== 1 && args.length !== 2) {
      throw new Error("INDIRECT expects one or two arguments");
    }

    const referenceValue = context.helpers.coerceScalar(
      context.evaluate(args[0]),
      "INDIRECT reference_text",
    );

    if (typeof referenceValue !== "string") {
      throw new Error("INDIRECT reference_text must be a string");
    }

    if (args.length === 2) {
      const a1Flag = context.helpers.coerceScalar(context.evaluate(args[1]), "INDIRECT a1");
      if (typeof a1Flag !== "boolean") {
        throw new Error("INDIRECT a1 flag must be boolean");
      }
      if (!a1Flag) {
        throw new Error("INDIRECT currently supports only A1 reference style");
      }
    }

    const referenceNode = resolveReferenceText(referenceValue.trim(), context);
    return context.evaluate(referenceNode);
  },
};

// NOTE: Uses parseReference injected by the evaluation engine to bind workbook-aware references.
