/**
 * @file Tabs component for navigating between sheets.
 */

import type { ReactElement } from "react";
import styles from "./Tabs.module.css";

export type Tab = {
  id: string;
  label: string;
};

export type TabsProps = {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
};

/**
 * Renders a horizontal tab navigation.
 * @param props - Component props
 * @returns Tabs component
 */
export const Tabs = ({ tabs, activeTabId, onTabChange }: TabsProps): ReactElement => {
  return (
    <div className={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={styles.tab}
          data-active={tab.id === activeTabId}
          onClick={(): void => {
            onTabChange(tab.id);
          }}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
