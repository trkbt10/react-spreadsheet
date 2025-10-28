/**
 * @file Input component that augments formula editing with function suggestions.
 */

import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent,
  FocusEventHandler,
  InputHTMLAttributes,
  KeyboardEvent,
  KeyboardEventHandler,
  MouseEvent,
  ReactElement,
  SyntheticEvent,
} from "react";
import {
  getFormulaCompletionContext,
  type FormulaCompletionContext,
} from "./formulaSuggestions/query";
import { filterFormulaSuggestions, loadFormulaSuggestions } from "./formulaSuggestions/data";
import type { FormulaFunctionSuggestion } from "./formulaSuggestions/types";
import styles from "./FormulaFunctionInput.module.css";

type FormulaFunctionInputProps = {
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onKeyDown" | "onFocus" | "onBlur">;

const getActiveSetter = (input: HTMLInputElement): ((value: string) => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  if (!descriptor || typeof descriptor.set !== "function") {
    throw new Error("Unable to access native value setter for input element");
  }
  return (nextValue: string) => {
    descriptor.set?.call(input, nextValue);
  };
};

const renderSuggestionDescription = (text: string): ReactElement | null => {
  if (text === "") {
    return null;
  }
  return <span className={styles.suggestionDescription}>{text}</span>;
};

const renderSuggestionExample = (example: string | undefined): ReactElement | null => {
  if (!example) {
    return null;
  }
  return (
    <span className={styles.suggestionExample}>
      Example: <code>{example}</code>
    </span>
  );
};

const clampCaret = (position: number, value: string): number => {
  if (position < 0) {
    return 0;
  }
  if (position > value.length) {
    return value.length;
  }
  return position;
};

const replaceFunctionToken = (
  currentValue: string,
  context: Extract<FormulaCompletionContext, { kind: "function" }>,
  suggestionName: string,
): { nextValue: string; caret: number } => {
  const { tokenStart, tokenEnd, hasOpeningParen } = context;
  const beforeToken = currentValue.slice(0, tokenStart);
  const afterToken = currentValue.slice(tokenEnd);

  if (hasOpeningParen) {
    const nextValue = `${beforeToken}${suggestionName}${afterToken}`;
    const caret = tokenStart + suggestionName.length;
    return {
      nextValue,
      caret,
    };
  }

  const trimmedSuffix = afterToken.replace(/^\s*/, "");
  const insert = `${suggestionName}()`;
  const nextValue = `${beforeToken}${insert}${trimmedSuffix}`;
  const caret = tokenStart + suggestionName.length + 1;
  return {
    nextValue,
    caret,
  };
};

export const FormulaFunctionInput = forwardRef<HTMLInputElement, FormulaFunctionInputProps>(
  (props, forwardedRef): ReactElement => {
    const {
      onChange,
      onKeyDown,
      onFocus,
      onBlur,
      onSelect,
      onKeyUp,
      onMouseUp,
      className,
      value,
      ...rest
    } = props;
    const internalRef = useRef<HTMLInputElement>(null);
    const mergeRefs = useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node;
        const targetRef = forwardedRef;
        if (typeof targetRef === "function") {
          targetRef(node);
          return;
        }
        if (targetRef !== null) {
          targetRef.current = node;
        }
      },
      [forwardedRef],
    );
    const [isFocused, setIsFocused] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [hasNavigatedSuggestions, setHasNavigatedSuggestions] = useState(false);
    const [caretPosition, setCaretPosition] = useState(() => value.length);

    const updateCaretPosition = useCallback(() => {
      const input = internalRef.current;
      if (!input) {
        return;
      }
      const caret = input.selectionStart ?? input.value.length;
      setCaretPosition(caret);
    }, []);

    const availableFunctions = useMemo<FormulaFunctionSuggestion[]>(() => {
      return loadFormulaSuggestions();
    }, []);

    const completionContext = useMemo<FormulaCompletionContext>(() => {
      return getFormulaCompletionContext(value, caretPosition);
    }, [caretPosition, value]);

    const query = completionContext.kind === "function" ? completionContext.query : null;

    const filteredSuggestions = useMemo(() => {
      return filterFormulaSuggestions(availableFunctions, query);
    }, [availableFunctions, query]);

    useEffect(() => {
      setHighlightedIndex(0);
      setHasNavigatedSuggestions(false);
    }, [query]);

    const suggestionListId = useId();
    const activeSuggestion = filteredSuggestions[highlightedIndex];
    const activeOptionId = activeSuggestion ? `${suggestionListId}-${highlightedIndex}` : undefined;

    const shouldShowSuggestions =
      isFocused && completionContext.kind === "function" ? filteredSuggestions.length > 0 : false;

    const focusHandler = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        updateCaretPosition();
        onFocus?.(event);
      },
      [onFocus, updateCaretPosition],
    );

    const blurHandler = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        updateCaretPosition();
        onBlur?.(event);
      },
      [onBlur, updateCaretPosition],
    );

    const applySuggestion = useCallback(
      (suggestion: FormulaFunctionSuggestion) => {
        if (completionContext.kind !== "function") {
          return;
        }

        const input = internalRef.current;
        if (!input) {
          return;
        }
        const { nextValue, caret } = replaceFunctionToken(input.value, completionContext, suggestion.name);
        const setter = getActiveSetter(input);
        setter(nextValue);
        const inputEvent = new Event("input", { bubbles: true });
        input.dispatchEvent(inputEvent);
        setHighlightedIndex(0);
        setHasNavigatedSuggestions(false);
        requestAnimationFrame(() => {
          const caretPosition = clampCaret(caret, nextValue);
          input.setSelectionRange(caretPosition, caretPosition);
          setCaretPosition(caretPosition);
        });
      },
      [completionContext],
    );

    const keyDownHandler = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (shouldShowSuggestions) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((previous) => {
              const next = previous + 1;
              if (next >= filteredSuggestions.length) {
                return 0;
              }
              return next;
            });
            setHasNavigatedSuggestions(true);
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((previous) => {
              if (previous === 0) {
                return filteredSuggestions.length - 1;
              }
              return previous - 1;
            });
            setHasNavigatedSuggestions(true);
            return;
          }
          if (event.key === "Tab" || event.key === "Enter") {
            const hasTypedQuery = query !== null && query !== "";
            const shouldApplySuggestion = hasNavigatedSuggestions ? true : hasTypedQuery;
            if (shouldApplySuggestion) {
              event.preventDefault();
              const targetSuggestion = filteredSuggestions[highlightedIndex];
              if (targetSuggestion) {
                applySuggestion(targetSuggestion);
              }
              return;
            }
          }
          if (event.key === "Escape") {
            setHighlightedIndex(0);
            setHasNavigatedSuggestions(false);
          }
        }
        onKeyDown?.(event);
      },
      [
        applySuggestion,
        filteredSuggestions,
        hasNavigatedSuggestions,
        highlightedIndex,
        onKeyDown,
        query,
        shouldShowSuggestions,
      ],
    );

    const changeHandler = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
        updateCaretPosition();
      },
      [onChange, updateCaretPosition],
    );

    useEffect(() => {
      updateCaretPosition();
    }, [updateCaretPosition, value]);

    const selectHandler = useCallback(
      (event: SyntheticEvent<HTMLInputElement>) => {
        updateCaretPosition();
        onSelect?.(event);
      },
      [onSelect, updateCaretPosition],
    );

    const keyUpHandler = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        updateCaretPosition();
        onKeyUp?.(event);
      },
      [onKeyUp, updateCaretPosition],
    );

    const mouseUpHandler = useCallback(
      (event: MouseEvent<HTMLInputElement>) => {
        updateCaretPosition();
        onMouseUp?.(event);
      },
      [onMouseUp, updateCaretPosition],
    );

    const suggestionPanel = useMemo(() => {
      if (!shouldShowSuggestions) {
        return null;
      }
      return (
        <div className={styles.suggestionPanel} id={suggestionListId} role="listbox">
          {filteredSuggestions.map((suggestion, index) => {
            const isActive = index === highlightedIndex;
            const optionId = `${suggestionListId}-${index}`;
            const description = suggestion.description ?? "";
            const descriptionNode = renderSuggestionDescription(description);
            const exampleNode = renderSuggestionExample(suggestion.example);
            return (
              <div
                key={suggestion.name}
                id={optionId}
                role="option"
                data-is-active={isActive ? "true" : "false"}
                className={styles.suggestion}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setHasNavigatedSuggestions(true);
                  applySuggestion(suggestion);
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
              >
                <span className={styles.suggestionName}>{suggestion.name}</span>
                {descriptionNode}
                {exampleNode}
              </div>
            );
          })}
        </div>
      );
    }, [applySuggestion, filteredSuggestions, highlightedIndex, shouldShowSuggestions, suggestionListId]);

    return (
      <div className={styles.container} data-suggestions-visible={shouldShowSuggestions ? "true" : "false"}>
        <input
          {...rest}
          ref={mergeRefs}
          className={className}
          value={value}
          onFocus={focusHandler}
          onBlur={blurHandler}
          onChange={changeHandler}
          onKeyDown={keyDownHandler}
          onSelect={selectHandler}
          onKeyUp={keyUpHandler}
          onMouseUp={mouseUpHandler}
          aria-autocomplete="list"
          aria-controls={shouldShowSuggestions ? suggestionListId : undefined}
          aria-activedescendant={activeOptionId}
        />
        {suggestionPanel}
      </div>
    );
  },
);

FormulaFunctionInput.displayName = "FormulaFunctionInput";

/**
 * Notes:
 * - Referred to src/modules/formula/functionRegistry.ts to access the registered function metadata for suggestions.
 */
