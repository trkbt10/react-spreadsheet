/**
 * @file Context analysis helpers for formula suggestion logic.
 */

export type FormulaCompletionContext =
  | {
      readonly kind: "function";
      readonly query: string;
      readonly tokenStart: number;
      readonly tokenEnd: number;
      readonly hasOpeningParen: boolean;
    }
  | {
      readonly kind: "none";
    };

const TOKEN_PATTERN = /[A-Za-z_][A-Za-z0-9_.]*$/u;
const CELL_REFERENCE_PATTERN = /^[A-Za-z]{1,3}\d{1,7}$/u;

const isDelimiter = (character: string | undefined): boolean => {
  if (!character) {
    return true;
  }
  if (/\s/u.test(character)) {
    return true;
  }
  return "=+-*/^&|,<>()\"'".includes(character);
};

const hasOpeningParenthesis = (suffix: string): boolean => {
  const trimmed = suffix.replace(/^\s+/u, "");
  return trimmed.startsWith("(");
};

const determineFunctionContext = (value: string, caretPosition: number): FormulaCompletionContext => {
  const safeCaret = Math.min(Math.max(caretPosition, 0), value.length);
  const beforeCaret = value.slice(0, safeCaret);
  const match = beforeCaret.match(TOKEN_PATTERN);
  if (!match) {
    return { kind: "none" };
  }

  const token = match[0];
  const tokenEnd = safeCaret;
  const tokenStart = tokenEnd - token.length;

  const previousCharacter = value[tokenStart - 1];
  if (!isDelimiter(previousCharacter)) {
    return { kind: "none" };
  }

  // Avoid treating obvious cell references as functions when no suggestion matches.
  if (CELL_REFERENCE_PATTERN.test(token) && token.length <= 4) {
    return { kind: "none" };
  }

  const suffix = value.slice(tokenEnd);
  const openingParen = hasOpeningParenthesis(suffix);

  return {
    kind: "function",
    query: token.toUpperCase(),
    tokenStart,
    tokenEnd,
    hasOpeningParen: openingParen,
  };
};

export const getFormulaCompletionContext = (value: string, caretPosition: number): FormulaCompletionContext => {
  if (!value.startsWith("=")) {
    return { kind: "none" };
  }
  return determineFunctionContext(value, caretPosition);
};

export const extractFormulaQuery = (value: string, caretPosition?: number): string | null => {
  const context = getFormulaCompletionContext(value, caretPosition ?? value.length);
  if (context.kind !== "function") {
    return null;
  }
  return context.query;
};

/**
 * Notes:
 * - Parses the token immediately preceding the caret to decide whether a function suggestion should be shown.
 * - Treats short column-style identifiers (e.g. "A1") as non-function tokens to avoid spurious completions.
 */
