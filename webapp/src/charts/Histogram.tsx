import { Fragment } from 'react';
import { useTooltip } from '../components/ui';
import { int, niceTicks } from '../lib/format';
import { GAP, linear, useIsNarrow, useMeasure, vBarPath } from './shared';

export interface Bin {
  x0: number;
  x1: number;
  count: number;
}

interface Props {
  bins: Bin[];
  color?: string;
  formatX: (v: number) => string;
  axisTitle: string;
  /** Optional vertical reference line, e.g. the median. */
  marker?: { value: number; label: string };
  height?: number;
}

/** Distribution columns. One series, so no legend box — the title names it. */
export function Histogram({
  bins,
  color = 'var(--series-1)',
  formatX,
  axisTitle,
  marker,
  height = 220,
}: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const narrow = useIsNarrow();
  const { setTip, hide, node } = useTooltip();

  const padLeft = 46;
  const padRight = 12;
  const padTop = marker ? 20 : 10;
  const axisBand = 38;

  const plotWidth = Math.max(60, width - padLeft - padRight);
  const plotHeight = height - padTop - axisBand;

  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const yTicks = niceTicks(maxCount, 4);
  const yMax = yTicks[yTicks.length - 1] || 1;

  const lo = bins[0]?.x0 ?? 0;
  const hi = bins[bins.length - 1]?.x1 ?? 1;
  const x = linear([lo, hi], [padLeft, padLeft + plotWidth]);
  const y = linear([0, yMax], [padTop + plotHeight, padTop]);

  const slot = plotWidth / Math.max(1, bins.length);
  const barWidth = Math.max(1, slot - GAP);

  // Label every bin edge only when they fit; otherwise every other one.
  const step = narrow || bins.length > 8 ? Math.ceil(bins.length / 4) : 1;

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Distribution of ${axisTitle}`}>
          {yTicks.map((t) => (
            <Fragment key={t}>
              <line className="gridline" x1={padLeft} x2={padLeft + plotWidth} y1={y(t)} y2={y(t)} />
              <text className="axis-label" x={padLeft - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                {int(t)}
              </text>
            </Fragment>
          ))}

          {bins.map((b, i) => {
            const bx = padLeft + i * slot + GAP / 2;
            return (
              <Fragment key={b.x0}>
                <path d={vBarPath(bx, barWidth, y(b.count), y(0))} fill={color} />
                <rect
                  className="hit"
                  x={padLeft + i * slot}
                  y={padTop}
                  width={slot}
                  height={plotHeight}
                  onMouseMove={(e) => {
                    const box = ref.current!.getBoundingClientRect();
                    setTip({
                      x: e.clientX - box.left,
                      y: e.clientY - box.top,
                      title: `${formatX(b.x0)} – ${formatX(b.x1)}`,
                      rows: [{ label: 'Listings', value: int(b.count) }],
                    });
                  }}
                  onMouseLeave={hide}
                />
              </Fragment>
            );
          })}

          {marker && (
            <>
              <line
                x1={x(marker.value)}
                x2={x(marker.value)}
                y1={padTop - 4}
                y2={padTop + plotHeight}
                stroke="var(--series-2)"
                strokeWidth="2"
              />
              <text
                className="value-label"
                x={x(marker.value)}
                y={padTop - 8}
                textAnchor={x(marker.value) > padLeft + plotWidth * 0.7 ? 'end' : 'middle'}
              >
                {marker.label}
              </text>
            </>
          )}

          <line
            className="baseline"
            x1={padLeft}
            x2={padLeft + plotWidth}
            y1={y(0)}
            y2={y(0)}
          />
          {bins.map((b, i) =>
            i % step === 0 ? (
              <text key={b.x0} className="axis-label" x={x(b.x0)} y={y(0) + 15} textAnchor="middle">
                {formatX(b.x0)}
              </text>
            ) : null,
          )}
          <text className="axis-title" x={padLeft} y={y(0) + 31}>
            {axisTitle}
          </text>
        </svg>
      )}
      {node}
    </div>
  );
}
