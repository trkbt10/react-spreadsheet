/**
 * @file Hook for composing multiple refs into a single callback ref.
 */

import { useCallback } from "react";

/**
 * Composes multiple refs into a single callback ref.
 * @param refs - Array of refs to compose
 * @returns Callback ref that assigns to all provided refs
 */
export const useRefComposer = <T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> => {
  return useCallback(
    (node: T | null): void => {
      for (const ref of refs) {
        if (!ref) {
          continue;
        }

        if (typeof ref === "function") {
          ref(node);
        } else {
          (ref as React.MutableRefObject<T | null>).current = node;
        }
      }
    },
    [refs],
  );
};
