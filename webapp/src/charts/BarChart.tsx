import { Fragment } from 'react';
import { Legend, useTooltip, type LegendEntry } from '../components/ui';
import { niceTicks } from '../lib/format';
import {
  BAR_MAX,
  GAP,
  ellipsize,
  hBarPath,
  linear,
  useIsNarrow,
  useMeasure,
} from './shared';

export interface BarDatum {
  label: string;
  /** One value per series, in the same order as `series`. */
  values: number[];
}

export interface BarSeries {
  label: string;
  color: string;
}

interface Props {
  data: BarDatum[];
  series: BarSeries[];
  /** Formats values for tips, direct labels and axis ticks. */
  format: (v: number) => string;
  axisTitle: string;
  /** Highlight one category by name; the rest recede. */
  emphasise?: string;
  maxLabelWidth?: number;
  /**
   * Per-category colours, one per datum. Only legitimate when the categories
   * are genuinely ordered (an ordinal ramp) — never as a value-ramp on nominal
   * categories, which would double-encode bar length as hue.
   */
  ordinalColors?: readonly string[];
}

/**
 * Horizontal bars. Horizontal because the categories here are named places and
 * room types whose labels do not fit under a column.
 */
export function BarChart({
  data,
  series,
  format,
  axisTitle,
  emphasise,
  maxLabelWidth = 128,
  ordinalColors,
}: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const narrow = useIsNarrow();
  const { setTip, hide, node } = useTooltip();

  const gutter = narrow ? 92 : maxLabelWidth;
  const padRight = 54;
  const padTop = 8;
  const axisBand = 34;

  const bandHeight = Math.max(
    series.length * (narrow ? 16 : 20) + 14,
    series.length > 1 ? 44 : 30,
  );
  const plotHeight = data.length * bandHeight;
  // The container includes the axis band, so the card never grows a nested scroll.
  const height = padTop + plotHeight + axisBand;

  const plotWidth = Math.max(60, width - gutter - padRight);
  const maxValue = Math.max(0, ...data.flatMap((d) => d.values));
  const ticks = niceTicks(maxValue, narrow ? 3 : 5);
  const domainMax = ticks[ticks.length - 1] || 1;
  const x = linear([0, domainMax], [gutter, gutter + plotWidth]);

  const showTipLabels = series.length === 1 || data.length <= 5;

  const legend: LegendEntry[] = ordinalColors
    ? data.map((d, i) => ({ label: d.label, color: ordinalColors[i] ?? series[0].color }))
    : series.map((s) => ({ label: s.label, color: s.color }));

  return (
    <div className="chart" ref={ref}>
      {(series.length > 1 || ordinalColors) && <Legend entries={legend} />}
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${axisTitle} by category`}>
          {/* Gridlines first — they sit behind the data. */}
          {ticks.map((t) => (
            <line
              key={t}
              className="gridline"
              x1={x(t)}
              x2={x(t)}
              y1={padTop}
              y2={padTop + plotHeight}
            />
          ))}
          <line
            className="baseline"
            x1={x(0)}
            x2={x(0)}
            y1={padTop}
            y2={padTop + plotHeight}
          />

          {data.map((d, i) => {
            const bandTop = padTop + i * bandHeight;
            const inner = bandHeight - 12;
            const thickness = Math.min(
              BAR_MAX,
              (inner - GAP * (series.length - 1)) / series.length,
            );
            const stackHeight = thickness * series.length + GAP * (series.length - 1);
            const first = bandTop + (bandHeight - stackHeight) / 2;
            const dimmed = emphasise !== undefined && d.label !== emphasise;

            return (
              <Fragment key={d.label}>
                <text
                  className="cat-label"
                  x={gutter - 10}
                  y={bandTop + bandHeight / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  opacity={dimmed ? 0.55 : 1}
                >
                  {ellipsize(d.label, gutter - 14, narrow ? 5.9 : 6.3)}
                </text>

                {series.map((s, si) => {
                  const y = first + si * (thickness + GAP);
                  const value = d.values[si] ?? 0;
                  const x1 = x(value);
                  const labelFits = x1 + 6 + format(value).length * 6.4 < width;
                  return (
                    <Fragment key={s.label}>
                      <path
                        d={hBarPath(x(0), x1, y, thickness)}
                        fill={
                          dimmed
                            ? 'var(--text-muted)'
                            : (ordinalColors?.[i] ?? s.color)
                        }
                        opacity={dimmed ? 0.35 : 1}
                      />
                      {showTipLabels && labelFits && (
                        <text
                          className="value-label"
                          x={x1 + 7}
                          y={y + thickness / 2}
                          dominantBaseline="middle"
                          opacity={dimmed ? 0.6 : 1}
                        >
                          {format(value)}
                        </text>
                      )}
                      {/* Hit area spans the full band row so the target clears 24px. */}
                      <rect
                        className="hit"
                        x={gutter}
                        y={y - GAP}
                        width={plotWidth}
                        height={thickness + GAP * 2}
                        onMouseMove={(e) => {
                          const box = ref.current!.getBoundingClientRect();
                          setTip({
                            x: e.clientX - box.left,
                            y: e.clientY - box.top,
                            title: d.label,
                            rows: series.map((ss, k) => ({
                              label: ss.label,
                              value: format(d.values[k] ?? 0),
                            })),
                          });
                        }}
                        onMouseLeave={hide}
                      />
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}

          {/* X axis */}
          <line
            className="baseline"
            x1={gutter}
            x2={gutter + plotWidth}
            y1={padTop + plotHeight}
            y2={padTop + plotHeight}
          />
          {ticks.map((t) => (
            <text
              key={t}
              className="axis-label"
              x={x(t)}
              y={padTop + plotHeight + 15}
              textAnchor="middle"
            >
              {format(t)}
            </text>
          ))}
          <text className="axis-title" x={gutter} y={padTop + plotHeight + 30}>
            {axisTitle}
          </text>
        </svg>
      )}
      {node}
    </div>
  );
}
