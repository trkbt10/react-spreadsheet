// @vitest-environment jsdom

/**
 * @file Tests for the FormulaFunctionInput component.
 */

import { act } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FormulaFunctionInput } from "./FormulaFunctionInput";

const ensureRequestAnimationFrame = (): void => {
  if (typeof window.requestAnimationFrame === "function") {
    return;
  }
  window.requestAnimationFrame = (callback: (timestamp: number) => void): number => {
    return window.setTimeout(() => {
      callback(Date.now());
    }, 16);
  };
};

const waitForAnimationFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
};

type HarnessHandle = {
  readonly inputRef: { current: HTMLInputElement | null };
};

const createHarness = (initialValue: string): { Component: () => ReactElement; handle: HarnessHandle } => {
  const inputRef = { current: null as HTMLInputElement | null };

  const Component = (): ReactElement => {
    const [value, setValue] = useState(initialValue);
    const localRef = useRef<HTMLInputElement | null>(null);

    useLayoutEffect(() => {
      inputRef.current = localRef.current;
    }, [value]);

    return (
      <FormulaFunctionInput
        ref={localRef}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    );
  };

  return {
    Component,
    handle: { inputRef },
  };
};

const typeIntoInput = (input: HTMLInputElement, value: string): void => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  if (!descriptor || typeof descriptor.set !== "function") {
    throw new Error("Unable to set input value");
  }
  descriptor.set.call(input, value);
  input.selectionStart = value.length;
  input.selectionEnd = value.length;
  act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

describe("FormulaFunctionInput suggestions", () => {
  const containerRef = { current: null as HTMLDivElement | null };
  const rootRef = { current: null as Root | null };

  beforeEach(() => {
    ensureRequestAnimationFrame();
    const container = document.createElement("div");
    document.body.appendChild(container);
    containerRef.current = container;
    rootRef.current = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      rootRef.current?.unmount();
    });
    containerRef.current?.remove();
    containerRef.current = null;
    rootRef.current = null;
  });

  it("applies suggestions without duplicating '=' and inserts placeholder parentheses", async () => {
    const { Component, handle } = createHarness("=");
    act(() => {
      rootRef.current?.render(<Component />);
    });

    const input = handle.inputRef.current;
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula function input not rendered");
    }

    act(() => {
      input.focus();
    });

    typeIntoInput(input, "=AVERAG");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await waitForAnimationFrame();

    expect(input.value).toBe("=AVERAGE()");
    expect(input.value.startsWith("==")).toBe(false);
    expect(input.selectionStart).toBe(9);
    expect(input.selectionEnd).toBe(9);
  });

  it("retains existing arguments while updating the function token", async () => {
    const { Component, handle } = createHarness("=AVER(A1:A5)");
    act(() => {
      rootRef.current?.render(<Component />);
    });

    const input = handle.inputRef.current;
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula function input not rendered");
    }

    act(() => {
      input.focus();
    });

    act(() => {
      input.setSelectionRange(5, 5);
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft", bubbles: true }));
    });

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await waitForAnimationFrame();

    expect(input.value).toBe("=AVERAGE(A1:A5)");
    expect(input.value.startsWith("==")).toBe(false);
    expect(input.selectionStart).toBe(8);
    expect(input.selectionEnd).toBe(8);
  });

  it("appends new function suggestions without replacing existing expressions", async () => {
    const { Component, handle } = createHarness("=SUM(A1)+");
    act(() => {
      rootRef.current?.render(<Component />);
    });

    const input = handle.inputRef.current;
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula function input not rendered");
    }

    act(() => {
      input.focus();
    });

    typeIntoInput(input, "=SUM(A1)+AVE");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await waitForAnimationFrame();

    expect(input.value).toBe("=SUM(A1)+AVERAGE()");
    expect(input.selectionStart).toBe(17);
    expect(input.selectionEnd).toBe(17);
  });

  it("suppresses suggestions once the caret moves inside argument lists", () => {
    const { Component, handle } = createHarness("=SUM(");
    act(() => {
      rootRef.current?.render(<Component />);
    });

    const input = handle.inputRef.current;
    expect(input).toBeInstanceOf(HTMLInputElement);
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Formula function input not rendered");
    }

    act(() => {
      input.focus();
    });

    const host = containerRef.current?.querySelector('[data-suggestions-visible]');
    expect(host).toBeInstanceOf(HTMLElement);
    if (!(host instanceof HTMLElement)) {
      throw new Error("Suggestion host not rendered");
    }

    expect(host.getAttribute("data-suggestions-visible")).toBe("false");
  });
});

// Notes:
// - Checked src/components/sheets/cell-input/CellEditor.spec.tsx to mirror helper utilities for synthetic input authoring.
