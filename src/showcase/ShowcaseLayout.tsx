/**
 * @file Storybook-style layout component for showcase pages.
 */

import type { ReactElement } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { ShowcaseMetadataProvider, useShowcaseMetadataContext } from "./ShowcaseMetadataContext";
import styles from "./ShowcaseLayout.module.css";

type NavItem = {
  path: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Components",
    items: [
      { path: "/catalog", label: "UI Components" },
      { path: "/catalog/graph-catalog", label: "Graph Catalog" },
    ],
  },
  {
    title: "Visualizations",
    items: [
      { path: "/catalog/dependency-graph", label: "Dependency Graph" },
    ],
  },
];

const ShowcaseLayoutContent = (): ReactElement => {
  const location = useLocation();
  const { metadata } = useShowcaseMetadataContext();

  const renderPageHeader = (): ReactElement | null => {
    if (metadata.title === undefined) {
      return null;
    }

    return (
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{metadata.title}</h1>
        {renderPageDescription()}
      </header>
    );
  };

  const renderPageDescription = (): ReactElement | null => {
    if (metadata.description === undefined) {
      return null;
    }

    return <p className={styles.pageDescription}>{metadata.description}</p>;
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>Showcase</h1>
        </header>
        <nav className={styles.nav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className={styles.navSection}>
              <h2 className={styles.navSectionTitle}>{section.title}</h2>
              <ul className={styles.navList}>
                {section.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={styles.navLink}
                      data-is-active={location.pathname === item.path}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        <div className={styles.contentInner}>
          {renderPageHeader()}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export const ShowcaseLayout = (): ReactElement => {
  return (
    <ShowcaseMetadataProvider>
      <ShowcaseLayoutContent />
    </ShowcaseMetadataProvider>
  );
};
