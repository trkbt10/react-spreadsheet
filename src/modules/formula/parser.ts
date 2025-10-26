/**
 * @file Parses formula strings into AST nodes.
 */

import type { FormulaAstNode } from "./ast";
import { collectDependencies, collectDependencyAddresses } from "./ast";
import type { ParseCellReferenceDependencies } from "./address";
import { parseCellLabel, parseCellReference } from "./address";
import type { FormulaPrimitiveValue, CellAddressKey } from "./types";

type OperatorToken = {
  type: "operator";
  value: "+" | "-" | "*" | "/" | "^";
};

type ComparatorToken = {
  type: "comparator";
  value: "=" | "<>" | ">" | "<" | ">=" | "<=";
};

type NumberToken = {
  type: "number";
  value: number;
};

type StringToken = {
  type: "string";
  value: string;
};

type IdentifierToken = {
  type: "identifier";
  value: string;
};

type ReferenceToken = {
  type: "reference";
  value: string;
};

type ParenthesisToken = {
  type: "paren";
  value: "(" | ")";
};

type BracketToken = {
  type: "bracket";
  value: "{" | "}";
};

type CommaToken = {
  type: "comma";
};

type SemicolonToken = {
  type: "semicolon";
};

type ColonToken = {
  type: "colon";
};

type EndToken = {
  type: "end";
};

type Token =
  | OperatorToken
  | ComparatorToken
  | NumberToken
  | StringToken
  | IdentifierToken
  | ReferenceToken
  | ParenthesisToken
  | BracketToken
  | CommaToken
  | SemicolonToken
  | ColonToken
  | EndToken;

const isDigit = (character: string): boolean => /[0-9]/u.test(character);
const isLetter = (character: string): boolean => /[A-Za-z]/u.test(character);
const isWhitespace = (character: string): boolean => /\s/u.test(character);

const NUMBER_PATTERN = /^[0-9]+(\.[0-9]+)?$/u;

const readWhile = (
  input: string,
  start: number,
  condition: (char: string) => boolean,
): { value: string; next: number } => {
  let index = start;
  let result = "";

  while (index < input.length && condition(input[index] ?? "")) {
    result += input[index];
    index += 1;
  }

  return {
    value: result,
    next: index,
  };
};

const readNumberToken = (input: string, start: number): { token: NumberToken; next: number } => {
  const { value, next } = readWhile(input, start, (char) => isDigit(char) || char === ".");
  if (!NUMBER_PATTERN.test(value)) {
    throw new Error(`Invalid number literal "${value}"`);
  }
  return {
    token: { type: "number", value: Number.parseFloat(value) },
    next,
  };
};

const readStringToken = (input: string, start: number): { token: StringToken; next: number } => {
  let index = start + 1;
  let result = "";

  while (index < input.length) {
    const char = input[index] ?? "";
    if (char === '"') {
      if (input[index + 1] === '"') {
        result += '"';
        index += 2;
        continue;
      }
      return {
        token: { type: "string", value: result },
        next: index + 1,
      };
    }
    result += char;
    index += 1;
  }

  throw new Error("Unterminated string literal");
};

const readCellLabel = (input: string, start: number): { label: string; next: number } => {
  const { value: columnPart, next: afterColumn } = readWhile(input, start, (char) => isLetter(char));
  if (columnPart.length === 0) {
    throw new Error("Missing column in cell reference");
  }

  const { value: rowPart, next } = readWhile(input, afterColumn, (char) => isDigit(char));
  if (rowPart.length === 0) {
    throw new Error("Missing row in cell reference");
  }

  return {
    label: `${columnPart.toUpperCase()}${rowPart}`,
    next,
  };
};

const readQuotedSheetReference = (input: string, start: number): { reference: string; next: number } => {
  let index = start + 1;
  let sheetName = "";

  while (index < input.length) {
    const char = input[index] ?? "";
    if (char === "'") {
      if (input[index + 1] === "'") {
        sheetName += "'";
        index += 2;
        continue;
      }
      index += 1;
      if (input[index] !== "!") {
        throw new Error("Quoted sheet reference must be followed by '!'");
      }
      index += 1;
      const { label, next } = readCellLabel(input, index);
      return {
        reference: `'${sheetName}'!${label}`,
        next,
      };
    }
    sheetName += char;
    index += 1;
  }

  throw new Error("Unterminated quoted sheet reference");
};

const readReferenceAfterIdentifier = (
  input: string,
  start: number,
  sheetName: string,
): { reference: string; next: number } => {
  if (input[start] !== "!") {
    throw new Error("Expected '!' in sheet-qualified reference");
  }

  const { label, next } = readCellLabel(input, start + 1);
  return {
    reference: `${sheetName}!${label}`,
    next,
  };
};

const readIdentifierOrReferenceToken = (
  input: string,
  start: number,
): { token: IdentifierToken | ReferenceToken; next: number } => {
  const { value: identifier, next } = readWhile(input, start, (char) => isLetter(char));
  const upcoming = input[next] ?? "";

  if (upcoming === "!") {
    const { reference, next: afterReference } = readReferenceAfterIdentifier(input, next, identifier);
    return {
      token: { type: "reference", value: reference },
      next: afterReference,
    };
  }

  if (isDigit(upcoming)) {
    const { value: digits, next: afterDigits } = readWhile(input, next, (char) => isDigit(char));
    return {
      token: { type: "reference", value: `${identifier.toUpperCase()}${digits}` },
      next: afterDigits,
    };
  }

  return {
    token: { type: "identifier", value: identifier.toUpperCase() },
    next,
  };
};

const readComparatorToken = (input: string, start: number): { token: ComparatorToken; next: number } => {
  const nextTwo = input.slice(start, start + 2);
  if (nextTwo === ">=" || nextTwo === "<=" || nextTwo === "<>") {
    return {
      token: { type: "comparator", value: nextTwo },
      next: start + 2,
    };
  }

  const single = input[start] ?? "";
  if (single === ">" || single === "<" || single === "=") {
    return {
      token: { type: "comparator", value: single },
      next: start + 1,
    };
  }

  throw new Error(`Invalid comparator starting at "${input.slice(start)}"`);
};

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index] ?? "";

    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma" });
      index += 1;
      continue;
    }

    if (char === ";") {
      tokens.push({ type: "semicolon" });
      index += 1;
      continue;
    }

    if (char === ":") {
      tokens.push({ type: "colon" });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === "{" || char === "}") {
      tokens.push({ type: "bracket", value: char });
      index += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === ">" || char === "<" || char === "=") {
      const { token, next } = readComparatorToken(input, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (char === '"') {
      const { token, next } = readStringToken(input, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (char === "'") {
      const { reference, next } = readQuotedSheetReference(input, index);
      tokens.push({ type: "reference", value: reference });
      index = next;
      continue;
    }

    if (isDigit(char)) {
      const { token, next } = readNumberToken(input, index);
      tokens.push(token);
      index = next;
      continue;
    }

    if (isLetter(char)) {
      const { token, next } = readIdentifierOrReferenceToken(input, index);
      tokens.push(token);
      index = next;
      continue;
    }

    throw new Error(`Unexpected token near "${input.slice(index)}"`);
  }

  tokens.push({ type: "end" });
  return tokens;
};

class TokenStream {
  private readonly tokens: Token[];
  private position: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
  }

  peek(): Token {
    return this.tokens[this.position] ?? { type: "end" };
  }

  consume(): Token {
    const token = this.tokens[this.position] ?? { type: "end" };
    this.position += 1;
    return token;
  }

  expect<T extends Token["type"]>(
    type: T,
    value?: Extract<Token, { type: T }> extends { value: infer V } ? V : undefined,
  ): Extract<Token, { type: T }> {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected token "${type}"${value ? ` (${String(value)})` : ""}`);
    }
    if (value !== undefined) {
      if (!("value" in token) || token.value !== value) {
        throw new Error(`Expected token "${type}" (${String(value)})`);
      }
    }
    return this.consume() as Extract<Token, { type: T }>;
  }
}

const booleanLiterals = new Map<string, boolean>([
  ["TRUE", true],
  ["FALSE", false],
]);

const nullLiteralIdentifiers = new Set(["NULL", "NIL"]);

const toPrimitiveLiteral = (token: IdentifierToken): FormulaPrimitiveValue | undefined => {
  const booleanLiteral = booleanLiterals.get(token.value);
  if (booleanLiteral !== undefined) {
    return booleanLiteral;
  }

  if (nullLiteralIdentifiers.has(token.value)) {
    return null;
  }

  return undefined;
};

type ParseContext = ParseCellReferenceDependencies;

const parsePrimary = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  const token = stream.peek();

  if (token.type === "number") {
    stream.consume();
    return { type: "Literal", value: token.value };
  }

  if (token.type === "string") {
    stream.consume();
    return { type: "Literal", value: token.value };
  }

  if (token.type === "bracket" && token.value === "{") {
    stream.consume();
    const rows: FormulaAstNode[][] = [];
    let currentRow: FormulaAstNode[] = [];

    const closingToken = stream.peek();
    if (closingToken.type === "bracket" && closingToken.value === "}") {
      stream.consume();
      return { type: "Array", elements: [[]] };
    }

    while (true) {
      currentRow.push(parseExpression(stream, context));
      const separator = stream.peek();

      if (separator.type === "comma") {
        stream.consume();
        continue;
      }

      if (separator.type === "semicolon") {
        stream.consume();
        rows.push(currentRow);
        currentRow = [];
        continue;
      }

      if (separator.type === "bracket" && separator.value === "}") {
        stream.consume();
        rows.push(currentRow);
        return { type: "Array", elements: rows };
      }

      throw new Error(`Unexpected token in array literal: ${separator.type}`);
    }
  }

  if (token.type === "identifier") {
    const literalValue = toPrimitiveLiteral(token);
    if (literalValue !== undefined) {
      stream.consume();
      return { type: "Literal", value: literalValue };
    }

    const identifierToken = stream.expect("identifier");
    const next = stream.peek();
    if (next.type === "paren" && next.value === "(") {
      stream.consume();
      const args: FormulaAstNode[] = [];
      const closingToken = stream.peek();
      if (closingToken.type !== "paren" || closingToken.value !== ")") {
        while (true) {
          args.push(parseExpression(stream, context));
          const separator = stream.peek();
          if (separator.type === "comma") {
            stream.consume();
            continue;
          }
          break;
        }
      }
      stream.expect("paren", ")");
      return {
        type: "Function",
        name: identifierToken.value,
        arguments: args,
      };
    }

    throw new Error(`Unexpected identifier "${identifierToken.value}"`);
  }

  if (token.type === "reference") {
    stream.consume();
    const startAddress = parseCellReference(token.value, context);
    const next = stream.peek();
    if (next.type === "colon") {
      stream.consume();
      const endToken = stream.expect("reference");
      const endAddress = endToken.value.includes("!")
        ? parseCellReference(endToken.value, context)
        : (() => {
            // NOTE: Excel-style ranges such as 'Sheet 2'!A2:B3 inherit the sheet from
            // the leading reference, so we reuse the start address metadata when the
            // trailing endpoint omits an explicit sheet qualifier.
            const coordinate = parseCellLabel(endToken.value);
            return {
              sheetId: startAddress.sheetId,
              sheetName: startAddress.sheetName,
              row: coordinate.row,
              column: coordinate.column,
            };
          })();
      return {
        type: "Range",
        start: startAddress,
        end: endAddress,
      };
    }
    return {
      type: "Reference",
      address: startAddress,
    };
  }

  if (token.type === "paren" && token.value === "(") {
    stream.consume();
    const expression = parseExpression(stream, context);
    stream.expect("paren", ")");
    return expression;
  }

  throw new Error("Unexpected token in expression");
};

const parseUnary = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  const token = stream.peek();
  if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
    stream.consume();
    return {
      type: "Unary",
      operator: token.value,
      argument: parseUnary(stream, context),
    };
  }
  return parsePrimary(stream, context);
};

const parseExponent = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  let node = parseUnary(stream, context);
  while (true) {
    const token = stream.peek();
    if (token.type === "operator" && token.value === "^") {
      stream.consume();
      node = {
        type: "Binary",
        operator: "^",
        left: node,
        right: parseUnary(stream, context),
      };
      continue;
    }
    break;
  }
  return node;
};

const parseTerm = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  let node = parseExponent(stream, context);
  while (true) {
    const token = stream.peek();
    if (token.type === "operator" && (token.value === "*" || token.value === "/")) {
      stream.consume();
      node = {
        type: "Binary",
        operator: token.value,
        left: node,
        right: parseExponent(stream, context),
      };
      continue;
    }
    break;
  }
  return node;
};

const parseAdditive = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  let node = parseTerm(stream, context);
  while (true) {
    const token = stream.peek();
    if (token.type === "operator" && (token.value === "+" || token.value === "-")) {
      stream.consume();
      node = {
        type: "Binary",
        operator: token.value,
        left: node,
        right: parseTerm(stream, context),
      };
      continue;
    }
    break;
  }
  return node;
};

const parseComparator = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  let node = parseAdditive(stream, context);
  while (true) {
    const token = stream.peek();
    if (token.type === "comparator") {
      stream.consume();
      node = {
        type: "Function",
        name: `COMPARE_${token.value}`,
        arguments: [node, parseAdditive(stream, context)],
      };
      continue;
    }
    break;
  }
  return node;
};

const parseExpression = (stream: TokenStream, context: ParseContext): FormulaAstNode => {
  return parseComparator(stream, context);
};

export type ParseFormulaResult = {
  ast: FormulaAstNode;
  dependencies: Set<CellAddressKey>;
  dependencyAddresses: ReturnType<typeof collectDependencyAddresses>;
};

export const parseFormula = (formula: string, context: ParseContext): ParseFormulaResult => {
  const trimmed = formula.trim();
  const normalized = trimmed.startsWith("=") ? trimmed.slice(1) : trimmed;
  if (normalized.length === 0) {
    throw new Error("Formula cannot be empty");
  }

  const tokens = tokenize(normalized);
  const stream = new TokenStream(tokens);
  const ast = parseExpression(stream, context);
  const tail = stream.peek();
  if (tail.type !== "end") {
    throw new Error("Unexpected trailing tokens in formula");
  }

  return {
    ast,
    dependencies: collectDependencies(ast),
    dependencyAddresses: collectDependencyAddresses(ast),
  };
};
