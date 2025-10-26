/**
 * @file Catalog component for previewing available graph types.
 */

import type { ReactElement } from "react";
import type { GraphType, SheetGraphElement } from "../../types";
import { GraphRenderer, type GraphDataPoint } from "./GraphRenderer";
import styles from "./GraphCatalog.module.css";

type GraphPreviewConfig = {
  type: GraphType;
  title: string;
  subtitle: string;
  element: SheetGraphElement;
  data: GraphDataPoint[];
};

const createGraphElement = (graphType: GraphType, width: number, height: number): SheetGraphElement => {
  return {
    id: `catalog-${graphType}`,
    elementType: "graph",
    graphType,
    anchorCell: "0:0",
    position: {
      x: width / 2,
      y: height / 2,
    },
    visibility: {
      hideWhenOutOfBounds: false,
    },
    transform: {
      width,
      height,
      rotation: {
        angle: 0,
        origin: {
          horizontal: "center",
          vertical: "center",
        },
      },
    },
    data: {
      range: {
        start: "0:0",
        end: "1:1",
      },
      labelCell: undefined,
    },
    options: {},
  };
};

const PREVIEW_DATA: GraphPreviewConfig[] = [
  {
    type: "column",
    title: "Column",
    subtitle: "Monthly revenue snapshot",
    element: createGraphElement("column", 320, 220),
    data: [
      { label: "Jan", value: 42 },
      { label: "Feb", value: 56 },
      { label: "Mar", value: 62 },
      { label: "Apr", value: 58 },
      { label: "May", value: 70 },
    ],
  },
  {
    type: "bar",
    title: "Bar",
    subtitle: "Quarterly spend distribution",
    element: createGraphElement("bar", 320, 220),
    data: [
      { label: "Q1", value: 120 },
      { label: "Q2", value: 138 },
      { label: "Q3", value: 110 },
      { label: "Q4", value: 152 },
    ],
  },
  {
    type: "line",
    title: "Line",
    subtitle: "Weekly active sessions",
    element: createGraphElement("line", 320, 220),
    data: [
      { label: "Week 1", value: 18 },
      { label: "Week 2", value: 26 },
      { label: "Week 3", value: 24 },
      { label: "Week 4", value: 31 },
    ],
  },
  {
    type: "area",
    title: "Area",
    subtitle: "Daily signups trend",
    element: createGraphElement("area", 320, 220),
    data: [
      { label: "Mon", value: 12 },
      { label: "Tue", value: 15 },
      { label: "Wed", value: 17 },
      { label: "Thu", value: 16 },
      { label: "Fri", value: 22 },
      { label: "Sat", value: 28 },
      { label: "Sun", value: 19 },
    ],
  },
  {
    type: "scatter",
    title: "Scatter",
    subtitle: "Latency (ms) vs run index",
    element: createGraphElement("scatter", 320, 220),
    data: [
      { label: "1", value: 42 },
      { label: "2", value: 48 },
      { label: "3", value: 36 },
      { label: "4", value: 52 },
      { label: "5", value: 44 },
      { label: "6", value: 39 },
    ],
  },
  {
    type: "pie",
    title: "Pie",
    subtitle: "Department allocation",
    element: createGraphElement("pie", 280, 280),
    data: [
      { label: "Product", value: 38 },
      { label: "Marketing", value: 24 },
      { label: "Operations", value: 18 },
      { label: "Support", value: 12 },
      { label: "Other", value: 8 },
    ],
  },
];

/**
 * Display preview cards for every supported graph type.
 * @returns Graph catalog component
 */
export const GraphCatalog = (): ReactElement => {
  return (
    <div className={styles.catalog}>
      {PREVIEW_DATA.map(({ type, title, subtitle, element, data }) => (
        <section key={type} className={styles.card}>
          <header className={styles.cardHeader}>
            <span className={styles.cardTitle}>{title}</span>
            <span className={styles.cardSubtitle}>{subtitle}</span>
          </header>
          <div className={styles.chart}>
            <GraphRenderer element={element} data={data} />
          </div>
        </section>
      ))}
    </div>
  );
};
