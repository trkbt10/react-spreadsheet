/**
 * @file VirtualScrollContext for providing scroll state to descendants.
 */

import { createContext, useContext } from "react";
import type { ReactNode, ReactElement } from "react";
import type { UseVirtualScrollReturn } from "../../hooks/useVirtualScroll";

export type VirtualScrollContextValue = UseVirtualScrollReturn;

const VirtualScrollContext = createContext<VirtualScrollContextValue | null>(null);

export type VirtualScrollProviderProps = {
  value: VirtualScrollContextValue;
  children: ReactNode;
};

/**
 * Provider component for VirtualScrollContext.
 * @param props - Component props
 * @returns VirtualScrollProvider component
 */
export const VirtualScrollProvider = ({ value, children }: VirtualScrollProviderProps): ReactElement => {
  return <VirtualScrollContext.Provider value={value}>{children}</VirtualScrollContext.Provider>;
};

/**
 * Hook to access VirtualScrollContext.
 * @throws Error if used outside VirtualScrollProvider
 * @returns VirtualScrollContextValue
 */
export const useVirtualScrollContext = (): VirtualScrollContextValue => {
  const context = useContext(VirtualScrollContext);
  if (!context) {
    throw new Error("useVirtualScrollContext must be used within VirtualScrollProvider");
  }
  return context;
};
