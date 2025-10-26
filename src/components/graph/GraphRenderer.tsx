/**
 * @file Graph renderer using visx primitives for different chart types.
 */

import { useMemo } from "react";
import type { ReactElement } from "react";
import type { SheetGraphElement, GraphType } from "../../types";
import { scaleBand, scaleLinear, scalePoint, scaleOrdinal } from "@visx/scale";
import { Bar, LinePath, AreaClosed, Pie } from "@visx/shape";
import { GlyphCircle } from "@visx/glyph";
import { LegendOrdinal } from "@visx/legend";
import { extent } from "@visx/vendor/d3-array";
import styles from "./GraphRenderer.module.css";

export type GraphDataPoint = {
  label: string;
  value: number;
};

export type GraphRendererProps = {
  element: SheetGraphElement;
  data: GraphDataPoint[];
  title?: string;
};

type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type ChartDimensions = {
  margin: ChartMargin;
  innerWidth: number;
  innerHeight: number;
  translate: string;
};

const CHART_MARGINS: Record<"default" | "bar" | "pie", ChartMargin> = {
  default: { top: 24, right: 24, bottom: 36, left: 48 },
  bar: { top: 24, right: 36, bottom: 24, left: 80 },
  pie: { top: 16, right: 16, bottom: 16, left: 16 },
};

const COLOR_PALETTE = [
  "var(--color-bg-accent)",
  "var(--color-text-danger)",
  "var(--color-text-secondary)",
  "var(--color-border-focus)",
  "color-mix(in srgb, var(--color-bg-accent) 60%, transparent)",
  "color-mix(in srgb, var(--color-text-danger) 55%, transparent)",
];

const AXIS_LINE_COLOR = "var(--color-border-secondary)";
const GRID_LINE_COLOR = "color-mix(in srgb, var(--color-border-secondary) 65%, transparent)";
const GLYPH_OUTLINE_COLOR = "var(--color-text-inverse)";
const GLYPH_BASE_FILL = "var(--color-bg-secondary)";

const getChartDimensions = (width: number, height: number, margin: ChartMargin): ChartDimensions => {
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  return {
    margin,
    innerWidth,
    innerHeight,
    translate: `translate(${margin.left}, ${margin.top})`,
  };
};

const getColor = (element: SheetGraphElement, index: number): string => {
  const customColor = element.options?.color;
  if (typeof customColor === "string" && customColor.length > 0 && index === 0) {
    return customColor;
  }
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

const getMaximumValue = (data: GraphDataPoint[]): number => {
  const range = extent(data, (point) => point.value);
  if (!range || range[1] === undefined) {
    return 0;
  }
  return range[1];
};

type BaseChartProps = {
  element: SheetGraphElement;
  data: GraphDataPoint[];
  width: number;
  height: number;
};

const ColumnChart = ({ element, data, width, height }: BaseChartProps): ReactElement => {
  const { innerWidth, innerHeight, translate } = getChartDimensions(width, height, CHART_MARGINS.default);
  const maxValue = getMaximumValue(data);
  const xScale = scaleBand<string>({
    domain: data.map((point) => point.label),
    range: [0, innerWidth],
    padding: 0.35,
  });
  const yScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 1 : maxValue],
    range: [innerHeight, 0],
    nice: true,
  });

  return (
    <g transform={translate}>
      <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={AXIS_LINE_COLOR} strokeWidth={1} />
      {data.map((point, index) => {
        const x = xScale(point.label);
        if (x === undefined) {
          return null;
        }

        const y = yScale(point.value);
        const barHeight = innerHeight - y;

        return (
          <g key={point.label}>
            <Bar
              x={x}
              y={y}
              width={Math.max(0, xScale.bandwidth())}
              height={Math.max(0, barHeight)}
              fill={getColor(element, index)}
              rx={6}
            />
            <text className={styles.axisLabel} textAnchor="middle" x={x + xScale.bandwidth() / 2} y={innerHeight + 16}>
              {point.label}
            </text>
            <text className={styles.valueLabel} textAnchor="middle" x={x + xScale.bandwidth() / 2} y={y - 6}>
              {point.value}
            </text>
          </g>
        );
      })}
      <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={GRID_LINE_COLOR} strokeDasharray="2 4" />
    </g>
  );
};

const BarChart = ({ element, data, width, height }: BaseChartProps): ReactElement => {
  const { innerWidth, innerHeight, translate } = getChartDimensions(width, height, CHART_MARGINS.bar);
  const maxValue = getMaximumValue(data);
  const yScale = scaleBand<string>({
    domain: data.map((point) => point.label),
    range: [0, innerHeight],
    padding: 0.25,
  });
  const xScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 1 : maxValue],
    range: [0, innerWidth],
    nice: true,
  });

  return (
    <g transform={translate}>
      <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={AXIS_LINE_COLOR} strokeWidth={1} />
      {data.map((point, index) => {
        const y = yScale(point.label);
        if (y === undefined) {
          return null;
        }

        const barWidth = xScale(point.value);

        return (
          <g key={point.label}>
            <Bar
              x={0}
              y={y}
              width={Math.max(0, barWidth)}
              height={Math.max(0, yScale.bandwidth())}
              fill={getColor(element, index)}
              ry={6}
            />
            <text className={styles.axisLabel} textAnchor="end" x={-8} y={y + yScale.bandwidth() / 2 + 4}>
              {point.label}
            </text>
            <text className={styles.valueLabel} textAnchor="start" x={barWidth + 8} y={y + yScale.bandwidth() / 2 + 4}>
              {point.value}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const LineChart = ({ element, data, width, height }: BaseChartProps): ReactElement => {
  const { innerWidth, innerHeight, translate } = getChartDimensions(width, height, CHART_MARGINS.default);
  const maxValue = getMaximumValue(data);
  const xScale = scalePoint<string>({
    domain: data.map((point) => point.label),
    range: [0, innerWidth],
    padding: 0.5,
  });
  const yScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 1 : maxValue],
    range: [innerHeight, 0],
    nice: true,
  });

  const color = getColor(element, 0);

  return (
    <g transform={translate}>
      <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={GRID_LINE_COLOR} strokeDasharray="4 6" />
      <LinePath
        data={data}
        x={(point) => {
          const value = xScale(point.label);
          return value === undefined ? 0 : value;
        }}
        y={(point) => yScale(point.value)}
        stroke={color}
        strokeWidth={2}
      />
      {data.map((point, index) => {
        const x = xScale(point.label);
        const y = yScale(point.value);
        if (x === undefined) {
          return null;
        }
        return (
          <g key={`${point.label}-${index}`}>
            <GlyphCircle left={x} top={y} size={70} stroke={GLYPH_OUTLINE_COLOR} strokeWidth={2} fill={color} />
            <text className={styles.valueLabel} textAnchor="middle" x={x} y={y - 10}>
              {point.value}
            </text>
            <text className={styles.axisLabel} textAnchor="middle" x={x} y={innerHeight + 18}>
              {point.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const AreaChart = ({ element, data, width, height }: BaseChartProps): ReactElement => {
  const { innerWidth, innerHeight, translate } = getChartDimensions(width, height, CHART_MARGINS.default);
  const maxValue = getMaximumValue(data);
  const xScale = scalePoint<string>({
    domain: data.map((point) => point.label),
    range: [0, innerWidth],
    padding: 0.5,
  });
  const yScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 1 : maxValue],
    range: [innerHeight, 0],
    nice: true,
  });

  const color = getColor(element, 0);

  return (
    <g transform={translate}>
      <AreaClosed<GraphDataPoint>
        data={data}
        x={(point) => {
          const value = xScale(point.label);
          return value === undefined ? 0 : value;
        }}
        y={(point) => yScale(point.value)}
        yScale={yScale}
        stroke={color}
        strokeWidth={1.5}
        fill={color}
        fillOpacity={0.24}
      />
      {data.map((point, index) => {
        const x = xScale(point.label);
        const y = yScale(point.value);
        if (x === undefined) {
          return null;
        }
        return (
          <g key={`${point.label}-${index}`}>
            <GlyphCircle left={x} top={y} size={60} stroke={AXIS_LINE_COLOR} strokeWidth={1} fill={GLYPH_BASE_FILL} />
            <text className={styles.valueLabel} textAnchor="middle" x={x} y={y - 10}>
              {point.value}
            </text>
            <text className={styles.axisLabel} textAnchor="middle" x={x} y={innerHeight + 18}>
              {point.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const ScatterChart = ({ element, data, width, height }: BaseChartProps): ReactElement => {
  const { innerWidth, innerHeight, translate } = getChartDimensions(width, height, CHART_MARGINS.default);
  const maxValue = getMaximumValue(data);
  const xScale = scaleLinear<number>({
    domain: [0, Math.max(1, data.length - 1)],
    range: [0, innerWidth],
  });
  const yScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 1 : maxValue],
    range: [innerHeight, 0],
    nice: true,
  });

  const color = getColor(element, 0);

  return (
    <g transform={translate}>
      <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={GRID_LINE_COLOR} strokeDasharray="4 6" />
      <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={GRID_LINE_COLOR} strokeDasharray="4 6" />
      {data.map((point, index) => {
        const x = xScale(index);
        const y = yScale(point.value);
        return (
          <g key={`${point.label}-${index}`}>
            <GlyphCircle left={x} top={y} size={80} stroke={GLYPH_OUTLINE_COLOR} strokeWidth={2} fill={color} />
            <text className={styles.valueLabel} textAnchor="middle" x={x} y={y - 10}>
              {point.value}
            </text>
            <text className={styles.axisLabel} textAnchor="middle" x={x} y={innerHeight + 18}>
              {point.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

type OrdinalScale = ReturnType<typeof scaleOrdinal<string, string>>;

const createPieColorScale = (element: SheetGraphElement, data: GraphDataPoint[]): OrdinalScale => {
  return scaleOrdinal<string, string>({
    domain: data.map((point) => point.label),
    range: data.map((_, index) => getColor(element, index)),
  });
};

type PieChartProps = BaseChartProps & {
  colorScale: OrdinalScale;
};

const PieChart = ({ element, data, width, height, colorScale }: PieChartProps): ReactElement => {
  const margin = CHART_MARGINS.pie;
  const radius = Math.max(0, Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2);

  return (
    <g transform={`translate(${width / 2}, ${height / 2})`}>
      <Pie<GraphDataPoint>
        data={data}
        outerRadius={radius}
        innerRadius={radius * 0.45}
        padAngle={0.015}
        cornerRadius={6}
        pieValue={(value) => Math.max(0, value.value)}
      >
        {(pie) =>
          pie.arcs.map((arc) => {
            const arcPath = pie.path(arc);
            if (!arcPath) {
              return null;
            }
            const [centroidX, centroidY] = pie.path.centroid(arc);
            return (
              <g key={arc.data.label}>
                <path d={arcPath} fill={colorScale(arc.data.label)} stroke={GLYPH_OUTLINE_COLOR} strokeWidth={1} />
                <text className={styles.valueLabel} x={centroidX} y={centroidY} textAnchor="middle">
                  {arc.data.value}
                </text>
              </g>
            );
          })
        }
      </Pie>
    </g>
  );
};

const createPieLegend = (colorScale: OrdinalScale, data: GraphDataPoint[]): ReactElement | null => {
  if (data.length <= 1) {
    return null;
  }

  return (
    <div className={styles.legend}>
      <LegendOrdinal scale={colorScale}>
        {(labels) =>
          labels.map((label) => (
            <span key={label.text ?? label.value} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ backgroundColor: label.value }} aria-hidden="true" />
              <span>{label.text ?? label.value}</span>
            </span>
          ))
        }
      </LegendOrdinal>
    </div>
  );
};

const CHART_COMPONENTS: Record<Exclude<GraphType, "pie">, (props: BaseChartProps) => ReactElement> = {
  column: (props) => ColumnChart(props),
  bar: (props) => BarChart(props),
  line: (props) => LineChart(props),
  area: (props) => AreaChart(props),
  scatter: (props) => ScatterChart(props),
};

/**
 * Render a visx graph based on the supplied element definition and data points.
 * @param props - Component props
 * @returns Graph renderer component
 */
export const GraphRenderer = ({ element, data, title }: GraphRendererProps): ReactElement => {
  const width = element.transform.width;
  const height = element.transform.height;

  const chartProps = useMemo<BaseChartProps>(() => ({ element, data, width, height }), [element, data, width, height]);

  if (data.length === 0) {
    return (
      <div className={styles.container} data-graph-type={element.graphType}>
        <div className={styles.emptyState}>No data available</div>
      </div>
    );
  }

  let chart: ReactElement;
  let legend: ReactElement | null = null;

  if (element.graphType === "pie") {
    const colorScale = createPieColorScale(element, data);
    chart = <PieChart {...chartProps} colorScale={colorScale} />;
    legend = createPieLegend(colorScale, data);
  } else {
    const component = CHART_COMPONENTS[element.graphType as Exclude<GraphType, "pie">];
    chart = component ? component(chartProps) : ColumnChart(chartProps);
  }

  return (
    <div className={styles.container} data-graph-type={element.graphType}>
      {title ? <div className={styles.title}>{title}</div> : null}
      <svg className={styles.svg} width={width} height={height} role="img" aria-label={title ?? element.graphType}>
        {chart}
      </svg>
      {legend}
    </div>
  );
};

// Debug notes:
// - Reviewed src/global.css to source color and spacing tokens for chart styling.
