/**
 * @file Helpers for analysing formula editing strings to derive function and argument metadata.
 */

const WHITESPACE_PATTERN = /\s/u;

const isWhitespace = (character: string): boolean => WHITESPACE_PATTERN.test(character);

const countLeadingWhitespace = (input: string): number => {
  const characters = Array.from(input);
  const index = characters.findIndex((character) => !isWhitespace(character));
  if (index === -1) {
    return input.length;
  }
  return index;
};

const countTrailingWhitespace = (input: string): number => {
  const reversedCharacters = Array.from(input).reverse();
  const index = reversedCharacters.findIndex((character) => !isWhitespace(character));
  if (index === -1) {
    return input.length;
  }
  return index;
};

export type ParsedFunctionArgument = {
  readonly index: number;
  readonly raw: string;
  readonly text: string;
  readonly rawStart: number;
  readonly rawEnd: number;
  readonly start: number;
  readonly end: number;
};

export type ParsedFunctionCall = {
  readonly name: string;
  readonly arguments: ReadonlyArray<ParsedFunctionArgument>;
  readonly openIndex: number;
  readonly closeIndex: number | null;
  readonly activeArgumentIndex: number | null;
};

type ArgumentReducerState = {
  readonly depth: number;
  readonly braceDepth: number;
  readonly inString: boolean;
  readonly skipNext: boolean;
  readonly currentStart: number;
  readonly arguments: ReadonlyArray<ParsedFunctionArgument>;
  readonly closeIndex: number | null;
  readonly done: boolean;
};

const addArgument = (
  value: string,
  args: ReadonlyArray<ParsedFunctionArgument>,
  rawStart: number,
  rawEnd: number,
): ReadonlyArray<ParsedFunctionArgument> => {
  if (rawEnd < rawStart) {
    return args;
  }

  const rawSegment = value.slice(rawStart, rawEnd);
  const leadingWhitespace = countLeadingWhitespace(rawSegment);
  const trailingWhitespace = countTrailingWhitespace(rawSegment);

  const trimmedStart = rawStart + leadingWhitespace;
  const trimmedEnd = rawEnd - trailingWhitespace;

  if (trimmedEnd < trimmedStart) {
    return args.concat({
      index: args.length,
      raw: rawSegment,
      text: "",
      rawStart,
      rawEnd,
      start: trimmedStart,
      end: trimmedStart,
    });
  }

  const text = value.slice(trimmedStart, trimmedEnd);

  return args.concat({
    index: args.length,
    raw: rawSegment,
    text,
    rawStart,
    rawEnd,
    start: trimmedStart,
    end: trimmedEnd,
  });
};

const reduceArguments = (
  value: string,
  argsStart: number,
): { arguments: ReadonlyArray<ParsedFunctionArgument>; closeIndex: number | null; complete: boolean } => {
  const characters = Array.from(value.slice(argsStart));
  const initialState: ArgumentReducerState = {
    depth: 0,
    braceDepth: 0,
    inString: false,
    skipNext: false,
    currentStart: argsStart,
    arguments: [],
    closeIndex: null,
    done: false,
  };

  const finalState = characters.reduce<ArgumentReducerState>((state, character, relativeIndex, source) => {
    if (state.done) {
      return state;
    }

    if (state.skipNext) {
      return {
        ...state,
        skipNext: false,
      };
    }

    const absoluteIndex = argsStart + relativeIndex;

    if (state.inString) {
      if (character === '"') {
        const nextCharacter = source[relativeIndex + 1];
        if (nextCharacter === '"') {
          return {
            ...state,
            skipNext: true,
          };
        }
        return {
          ...state,
          inString: false,
        };
      }
      return state;
    }

    if (character === '"') {
      return {
        ...state,
        inString: true,
      };
    }

    if (character === "(") {
      return {
        ...state,
        depth: state.depth + 1,
      };
    }

    if (character === ")") {
      if (state.depth === 0 && state.braceDepth === 0) {
        const updatedArguments = addArgument(value, state.arguments, state.currentStart, absoluteIndex);
        return {
          ...state,
          arguments: updatedArguments,
          closeIndex: absoluteIndex,
          done: true,
        };
      }
      const nextDepth = state.depth > 0 ? state.depth - 1 : 0;
      return {
        ...state,
        depth: nextDepth,
      };
    }

    if (character === "{") {
      return {
        ...state,
        braceDepth: state.braceDepth + 1,
      };
    }

    if (character === "}") {
      const nextBraceDepth = state.braceDepth > 0 ? state.braceDepth - 1 : 0;
      return {
        ...state,
        braceDepth: nextBraceDepth,
      };
    }

    if (character === "," && state.depth === 0 && state.braceDepth === 0) {
      const updatedArguments = addArgument(value, state.arguments, state.currentStart, absoluteIndex);
      return {
        ...state,
        arguments: updatedArguments,
        currentStart: absoluteIndex + 1,
      };
    }

    return state;
  }, initialState);

  if (finalState.done) {
    return {
      arguments: finalState.arguments,
      closeIndex: finalState.closeIndex,
      complete: true,
    };
  }

  const hasTrailingContent = value.length > finalState.currentStart;
  if (!hasTrailingContent) {
    return {
      arguments: finalState.arguments,
      closeIndex: null,
      complete: false,
    };
  }

  const trailingArguments = addArgument(value, finalState.arguments, finalState.currentStart, value.length);

  return {
    arguments: trailingArguments,
    closeIndex: null,
    complete: false,
  };
};

const isLetter = (character: string): boolean => /^[A-Za-z_]$/u.test(character);
const isIdentifierCharacter = (character: string): boolean => /^[A-Za-z0-9_.]$/u.test(character);

const findTopLevelFunction = (value: string): { name: string; openIndex: number } | null => {
  const leadingWhitespace = countLeadingWhitespace(value);
  const afterLeading = value.slice(leadingWhitespace);
  if (!afterLeading.startsWith("=")) {
    return null;
  }

  const expressionStart = leadingWhitespace + 1;
  const expression = value.slice(expressionStart);
  const expressionWhitespace = countLeadingWhitespace(expression);
  const nameStart = expressionStart + expressionWhitespace;

  const nameFirstChar = value[nameStart];
  if (!nameFirstChar || !isLetter(nameFirstChar)) {
    return null;
  }

  const remaining = value.slice(nameStart);
  const characters = Array.from(remaining);

  const identifierResult = characters.reduce<
    { end: number | null; encounteredOpen: boolean; encounteredInvalid: boolean }
  >(
    (acc, character, index) => {
      if (acc.encounteredInvalid || acc.encounteredOpen) {
        return acc;
      }
      if (character === "(") {
        return {
          end: nameStart + index,
          encounteredOpen: true,
          encounteredInvalid: false,
        };
      }
      if (!isIdentifierCharacter(character) && !isWhitespace(character)) {
        return {
          end: null,
          encounteredOpen: false,
          encounteredInvalid: true,
        };
      }
      return acc;
    },
    {
      end: null,
      encounteredOpen: false,
      encounteredInvalid: false,
    },
  );

  if (identifierResult.encounteredInvalid || identifierResult.end === null) {
    return null;
  }

  const nameEnd = identifierResult.end;
  const remainder = value.slice(nameEnd);
  const remainderWhitespace = countLeadingWhitespace(remainder);
  const openIndex = nameEnd + remainderWhitespace;

  if (value[openIndex] !== "(") {
    return null;
  }

  const name = value.slice(nameStart, nameEnd);
  if (name.length === 0) {
    return null;
  }

  return {
    name: name.toUpperCase(),
    openIndex,
  };
};

export const parseTopLevelFunction = (
  value: string,
  caret: { start: number; end: number },
): ParsedFunctionCall | null => {
  const functionInfo = findTopLevelFunction(value);
  if (!functionInfo) {
    return null;
  }

  const argsStart = functionInfo.openIndex + 1;
  const { arguments: parsedArguments, closeIndex } = reduceArguments(value, argsStart);

  const activeArgumentIndex =
    parsedArguments.find((argument) => {
      if (argument.start === argument.end) {
        return caret.start === argument.start;
      }
      return caret.start >= argument.start && caret.start <= argument.end;
    })?.index ?? null;

  return {
    name: functionInfo.name,
    arguments: parsedArguments,
    openIndex: functionInfo.openIndex,
    closeIndex,
    activeArgumentIndex,
  };
};
