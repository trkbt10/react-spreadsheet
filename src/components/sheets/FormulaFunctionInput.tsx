/**
 * @file Input component that augments formula editing with function suggestions.
 */

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent,
  FocusEventHandler,
  InputHTMLAttributes,
  KeyboardEvent,
  KeyboardEventHandler,
  ReactElement,
} from "react";
import { listFormulaFunctions } from "../../modules/formula/functionRegistry";
import styles from "./FormulaFunctionInput.module.css";

type FormulaFunctionSuggestion = {
  name: string;
  description?: string;
};

type FormulaFunctionInputProps = {
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onKeyDown" | "onFocus" | "onBlur">;

const MAX_SUGGESTIONS = 8;

const extractQuery = (inputValue: string): string | null => {
  if (!inputValue.startsWith("=")) {
    return null;
  }
  const sliced = inputValue.slice(1);
  const match = sliced.match(/^[A-Za-z]+/);
  if (!match) {
    return "";
  }
  return match[0].toUpperCase();
};

const getActiveSetter = (input: HTMLInputElement): ((value: string) => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  if (!descriptor || typeof descriptor.set !== "function") {
    throw new Error("Unable to access native value setter for input element");
  }
  return (nextValue: string) => {
    descriptor.set?.call(input, nextValue);
  };
};

export const FormulaFunctionInput = forwardRef<HTMLInputElement, FormulaFunctionInputProps>(
  (props, forwardedRef): ReactElement => {
    const { onChange, onKeyDown, onFocus, onBlur, className, value, ...rest } = props;
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current, []);

    const [isFocused, setIsFocused] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const availableFunctions = useMemo<FormulaFunctionSuggestion[]>(() => {
      return listFormulaFunctions().map((definition) => {
        const description = definition.description?.ja ?? definition.description?.en;
        return {
          name: definition.name,
          description,
        } satisfies FormulaFunctionSuggestion;
      });
    }, []);

    const query = useMemo(() => {
      return extractQuery(value);
    }, [value]);

    const filteredSuggestions = useMemo(() => {
      if (query === null) {
        return [] satisfies FormulaFunctionSuggestion[];
      }
      if (query === "") {
        return availableFunctions.slice(0, MAX_SUGGESTIONS);
      }
      const normalized = query;
      const matching = availableFunctions.filter((suggestion) => {
        return suggestion.name.startsWith(normalized);
      });
      if (matching.length > 0) {
        return matching.slice(0, MAX_SUGGESTIONS);
      }
      const partialMatches = availableFunctions.filter((suggestion) => {
        return suggestion.name.includes(normalized);
      });
      return partialMatches.slice(0, MAX_SUGGESTIONS);
    }, [availableFunctions, query]);

    useEffect(() => {
      setHighlightedIndex(0);
    }, [query]);

    const suggestionListId = useId();
    const activeOptionId = filteredSuggestions[highlightedIndex]
      ? `${suggestionListId}-${highlightedIndex}`
      : undefined;

    const shouldShowSuggestions = isFocused && filteredSuggestions.length > 0;

    const focusHandler = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(event);
      },
      [onFocus],
    );

    const blurHandler = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(event);
      },
      [onBlur],
    );

    const applySuggestion = useCallback((suggestion: FormulaFunctionSuggestion) => {
      const input = internalRef.current;
      if (!input) {
        return;
      }
      const nextValue = `=${suggestion.name}(`;
      const setter = getActiveSetter(input);
      setter(nextValue);
      const inputEvent = new Event("input", { bubbles: true });
      input.dispatchEvent(inputEvent);
      setHighlightedIndex(0);
      requestAnimationFrame(() => {
        input.setSelectionRange(nextValue.length, nextValue.length);
      });
    }, []);

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
            return;
          }
          if (event.key === "Tab" || event.key === "Enter") {
            event.preventDefault();
            const targetSuggestion = filteredSuggestions[highlightedIndex];
            if (targetSuggestion) {
              applySuggestion(targetSuggestion);
            }
            return;
          }
          if (event.key === "Escape") {
            setHighlightedIndex(0);
          }
        }
        onKeyDown?.(event);
      },
      [applySuggestion, filteredSuggestions, highlightedIndex, onKeyDown, shouldShowSuggestions],
    );

    const changeHandler = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
      },
      [onChange],
    );

    return (
      <div className={styles.container} data-suggestions-visible={shouldShowSuggestions ? "true" : "false"}>
        <input
          {...rest}
          ref={internalRef}
          className={className}
          value={value}
          onFocus={focusHandler}
          onBlur={blurHandler}
          onChange={changeHandler}
          onKeyDown={keyDownHandler}
          aria-autocomplete="list"
          aria-controls={shouldShowSuggestions ? suggestionListId : undefined}
          aria-activedescendant={activeOptionId}
        />
        {shouldShowSuggestions ? (
          <div className={styles.suggestionPanel} id={suggestionListId} role="listbox">
            {filteredSuggestions.map((suggestion, index) => {
              const isActive = index === highlightedIndex;
              const optionId = `${suggestionListId}-${index}`;
              const description = suggestion.description ?? "";
              return (
                <div
                  key={suggestion.name}
                  id={optionId}
                  role="option"
                  data-is-active={isActive ? "true" : "false"}
                  className={styles.suggestion}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applySuggestion(suggestion);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                  }}
                >
                  <span className={styles.suggestionName}>{suggestion.name}</span>
                  {description !== "" ? <span className={styles.suggestionDescription}>{description}</span> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  },
);

FormulaFunctionInput.displayName = "FormulaFunctionInput";

/**
 * Notes:
 * - Referred to src/modules/formula/functionRegistry.ts to access the registered function metadata for suggestions.
 */
