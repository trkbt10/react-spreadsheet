/**
 * @file VirtualScroll container component for managing virtual scroll viewport.
 */

import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useVirtualScroll } from "../../hooks/useVirtualScroll";
import type { UseVirtualScrollOptions } from "../../hooks/useVirtualScroll";
import { VirtualScrollProvider } from "./VirtualScrollContext";
import { Scrollbar } from "./Scrollbar";
import styles from "./VirtualScroll.module.css";

export type VirtualScrollProps = UseVirtualScrollOptions & {
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * VirtualScroll container component.
 * Provides virtual scroll context and renders scrollbars.
 * Child components can access scroll state via useVirtualScrollContext.
 * @param props - Component props
 * @returns VirtualScroll component
 */
export const VirtualScroll = ({ contentWidth, contentHeight, children, style }: VirtualScrollProps): ReactElement => {
  const virtualScroll = useVirtualScroll({
    contentWidth,
    contentHeight,
  });

  const {
    containerRef,
    handleKeyDown,
    scrollTop,
    scrollLeft,
    viewportWidth,
    viewportHeight,
    setScrollTop,
    setScrollLeft,
  } = virtualScroll;

  return (
    <VirtualScrollProvider value={virtualScroll}>
      <div ref={containerRef} className={styles.scrollContainer} style={style} onKeyDown={handleKeyDown} tabIndex={0}>
        <div className={styles.viewport}>
          <div className={styles.content}>{children}</div>
        </div>
        <Scrollbar
          orientation="vertical"
          size={contentHeight}
          viewportSize={viewportHeight}
          scrollPosition={scrollTop}
          onScrollChange={setScrollTop}
        />
        <Scrollbar
          orientation="horizontal"
          size={contentWidth}
          viewportSize={viewportWidth}
          scrollPosition={scrollLeft}
          onScrollChange={setScrollLeft}
        />
      </div>
    </VirtualScrollProvider>
  );
};
