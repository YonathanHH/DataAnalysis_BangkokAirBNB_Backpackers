import { Fragment } from 'react';
import { useTooltip } from '../components/ui';
import { niceTicks } from '../lib/format';
import type { FiveNumber } from '../lib/stats';
import { ellipsize, linear, useIsNarrow, useMeasure } from './shared';

export interface BoxDatum extends FiveNumber {
  label: string;
  color: string;
}

interface Props {
  data: BoxDatum[];
  format: (v: number) => string;
  axisTitle: string;
}

/**
 * Five-number summary per category — the notebook's `sns.boxplot(x=room_type)`.
 * Whiskers run to the observed min and max rather than 1.5 IQR, because the
 * frame is already outlier-trimmed and the true extremes are the point.
 */
export function BoxPlot({ data, format, axisTitle }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const narrow = useIsNarrow();
  const { setTip, hide, node } = useTooltip();

  const gutter = narrow ? 96 : 128;
  // Wide enough for the median label to sit clear of the max whisker.
  const padRight = 62;
  const padTop = 10;
  const axisBand = 34;
  const rowHeight = 52;
  const boxHeight = 22;

  const plotWidth = Math.max(60, width - gutter - padRight);
  const plotHeight = data.length * rowHeight;
  const height = padTop + plotHeight + axisBand;

  const maxValue = Math.max(0, ...data.map((d) => d.max));
  const ticks = niceTicks(maxValue, narrow ? 3 : 5);
  const domainMax = ticks[ticks.length - 1] || 1;
  const x = linear([0, domainMax], [gutter, gutter + plotWidth]);

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${axisTitle} spread by category`}>
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

          {data.map((d, i) => {
            const cy = padTop + i * rowHeight + rowHeight / 2;
            const top = cy - boxHeight / 2;
            return (
              <Fragment key={d.label}>
                <text
                  className="cat-label"
                  x={gutter - 10}
                  y={cy}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {ellipsize(d.label, gutter - 14, narrow ? 5.9 : 6.3)}
                </text>

                {/* Whiskers */}
                <line
                  x1={x(d.min)}
                  x2={x(d.max)}
                  y1={cy}
                  y2={cy}
                  stroke={d.color}
                  strokeWidth="2"
                  opacity="0.5"
                />
                <line x1={x(d.min)} x2={x(d.min)} y1={cy - 6} y2={cy + 6} stroke={d.color} strokeWidth="2" />
                <line x1={x(d.max)} x2={x(d.max)} y1={cy - 6} y2={cy + 6} stroke={d.color} strokeWidth="2" />

                {/* IQR box */}
                <rect
                  x={x(d.q1)}
                  y={top}
                  width={Math.max(2, x(d.q3) - x(d.q1))}
                  height={boxHeight}
                  rx="4"
                  fill={d.color}
                  opacity="0.9"
                />
                {/* Median, ringed in the surface colour so it reads over the fill */}
                <line
                  x1={x(d.median)}
                  x2={x(d.median)}
                  y1={top - 2}
                  y2={top + boxHeight + 2}
                  stroke="var(--surface)"
                  strokeWidth="4"
                />
                <line
                  x1={x(d.median)}
                  x2={x(d.median)}
                  y1={top - 2}
                  y2={top + boxHeight + 2}
                  stroke="var(--text-primary)"
                  strokeWidth="2"
                />
                <text
                  className="value-label"
                  x={x(d.max) + 9}
                  y={cy}
                  dominantBaseline="middle"
                  textAnchor="start"
                >
                  {format(d.median)}
                </text>

                <rect
                  className="hit"
                  x={gutter}
                  y={cy - rowHeight / 2}
                  width={plotWidth}
                  height={rowHeight}
                  onMouseMove={(e) => {
                    const box = ref.current!.getBoundingClientRect();
                    setTip({
                      x: e.clientX - box.left,
                      y: e.clientY - box.top,
                      title: `${d.label} · ${d.n.toLocaleString('en-US')} listings`,
                      rows: [
                        { label: 'Min', value: format(d.min) },
                        { label: '25th pct', value: format(d.q1) },
                        { label: 'Median', value: format(d.median) },
                        { label: '75th pct', value: format(d.q3) },
                        { label: 'Max', value: format(d.max) },
                      ],
                    });
                  }}
                  onMouseLeave={hide}
                />
              </Fragment>
            );
          })}

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
            {axisTitle} · box = 25th–75th percentile, line = median
          </text>
        </svg>
      )}
      {node}
    </div>
  );
}
