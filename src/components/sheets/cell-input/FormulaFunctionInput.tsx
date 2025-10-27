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
  ReactElement,
} from "react";
import { extractFormulaQuery } from "./formulaSuggestions/query";
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

export const FormulaFunctionInput = forwardRef<HTMLInputElement, FormulaFunctionInputProps>(
  (props, forwardedRef): ReactElement => {
    const { onChange, onKeyDown, onFocus, onBlur, className, value, ...rest } = props;
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

    const availableFunctions = useMemo<FormulaFunctionSuggestion[]>(() => {
      return loadFormulaSuggestions();
    }, []);

    const query = useMemo(() => {
      return extractFormulaQuery(value);
    }, [value]);

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

    const shouldShowSuggestions = isFocused ? filteredSuggestions.length > 0 : false;

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
            const shouldApplySuggestion = hasNavigatedSuggestions || (query !== null && query !== "");
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
      [applySuggestion, filteredSuggestions, hasNavigatedSuggestions, highlightedIndex, onKeyDown, query, shouldShowSuggestions],
    );

    const changeHandler = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
      },
      [onChange],
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
