import { Fragment, useEffect, useState } from 'react';
import { Legend, useTooltip, type LegendEntry } from '../components/ui';
import { int, pct } from '../lib/format';
import {
  GAP,
  ellipsize,
  pickInk,
  resolveVar,
  useIsNarrow,
  useMeasure,
  useThemeVersion,
} from './shared';

export interface StackRow {
  label: string;
  /** Counts per series, in the order of `series`. */
  values: number[];
}

interface Props {
  data: StackRow[];
  series: { label: string; color: string }[];
  /** Reference share drawn as a hairline, e.g. the 50% median split. */
  reference?: { value: number; label: string };
}

/**
 * Share-of-total bars. Part-to-whole across a handful of categories, which is
 * what a stacked bar is actually good at — and the values stay reachable in
 * the table view, so nothing rides on segment colour alone.
 */
export function StackedBar({ data, series, reference }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const narrow = useIsNarrow();
  const { setTip, hide, node } = useTooltip();
  const themeVersion = useThemeVersion();

  // In-segment labels take white or near-black by the fill's own luminance,
  // recomputed when the theme swaps the series colours underneath them.
  const [inks, setInks] = useState<string[]>([]);
  useEffect(() => {
    setInks(series.map((s) => pickInk(resolveVar(s.color))));
  }, [series, themeVersion]);

  const gutter = narrow ? 96 : 132;
  const padRight = 8;
  const padTop = reference ? 20 : 6;
  const axisBand = 32;
  const rowHeight = 42;
  const barHeight = 22;

  const plotWidth = Math.max(60, width - gutter - padRight);
  const plotHeight = data.length * rowHeight;
  const height = padTop + plotHeight + axisBand;

  const legend: LegendEntry[] = series.map((s) => ({ label: s.label, color: s.color }));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="chart" ref={ref}>
      <Legend entries={legend} />
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Share of listings by segment">
          {ticks.map((t) => (
            <line
              key={t}
              className="gridline"
              x1={gutter + t * plotWidth}
              x2={gutter + t * plotWidth}
              y1={padTop}
              y2={padTop + plotHeight}
            />
          ))}

          {data.map((row, i) => {
            const total = row.values.reduce((a, b) => a + b, 0) || 1;
            const y = padTop + i * rowHeight + (rowHeight - barHeight) / 2;
            let cursor = gutter;

            return (
              <Fragment key={row.label}>
                <text
                  className="cat-label"
                  x={gutter - 10}
                  y={padTop + i * rowHeight + rowHeight / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {ellipsize(row.label, gutter - 14, narrow ? 5.9 : 6.3)}
                </text>

                {series.map((s, si) => {
                  const share = row.values[si] / total;
                  const full = share * plotWidth;
                  // The 2px gap is carved out of the segment, not drawn as a stroke.
                  const isLast = si === series.length - 1;
                  const segWidth = Math.max(0, full - (isLast ? 0 : GAP));
                  const x0 = cursor;
                  cursor += full;

                  const text = pct(share, 0);
                  const fits = segWidth > text.length * 7.4 + 14;

                  return (
                    <Fragment key={s.label}>
                      <rect
                        x={x0}
                        y={y}
                        width={segWidth}
                        height={barHeight}
                        rx={si === 0 || isLast ? 4 : 0}
                        fill={s.color}
                      />
                      {fits && (
                        <text
                          x={x0 + segWidth / 2}
                          y={y + barHeight / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            // Ink chosen by fill luminance so it always clears contrast.
                            fill: inks[si] ?? '#ffffff',
                          }}
                        >
                          {text}
                        </text>
                      )}
                      <rect
                        className="hit"
                        x={x0}
                        y={y - 6}
                        width={Math.max(segWidth, 4)}
                        height={barHeight + 12}
                        onMouseMove={(e) => {
                          const box = ref.current!.getBoundingClientRect();
                          setTip({
                            x: e.clientX - box.left,
                            y: e.clientY - box.top,
                            title: row.label,
                            rows: series.map((ss, k) => ({
                              label: ss.label,
                              value: `${int(row.values[k])} (${pct(row.values[k] / total, 0)})`,
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

          {reference && (
            <>
              <line
                x1={gutter + reference.value * plotWidth}
                x2={gutter + reference.value * plotWidth}
                y1={padTop - 4}
                y2={padTop + plotHeight}
                stroke="var(--text-primary)"
                strokeWidth="2"
              />
              <text
                className="value-label"
                x={gutter + reference.value * plotWidth}
                y={padTop - 8}
                textAnchor="middle"
              >
                {reference.label}
              </text>
            </>
          )}

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
              x={gutter + t * plotWidth}
              y={padTop + plotHeight + 15}
              textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}
            >
              {pct(t, 0)}
            </text>
          ))}
          <text className="axis-title" x={gutter} y={padTop + plotHeight + 29}>
            Share of listings
          </text>
        </svg>
      )}
      {node}
    </div>
  );
}
