import { Fragment, useEffect, useRef } from 'react';
import { Legend, useTooltip, type LegendEntry } from '../components/ui';
import { niceTicks } from '../lib/format';
import { linear, resolveVar, useIsNarrow, useMeasure, useThemeVersion } from './shared';

export interface Point {
  x: number;
  y: number;
  label?: string;
}

interface Props {
  points: Point[];
  color?: string;
  xTitle: string;
  yTitle: string;
  formatX: (v: number) => string;
  formatY: (v: number) => string;
  /** Least-squares trend line, mirroring seaborn's regplot overlay. */
  trend?: { slope: number; intercept: number } | null;
  trendLabel?: string;
  height?: number;
  /** Radius in CSS pixels. Dense clouds want small marks. */
  radius?: number;
}

/**
 * Point cloud on canvas — 6,600 SVG circles would stall the main thread, and
 * the hover layer is a nearest-point search rather than per-mark hit areas.
 */
export function Scatter({
  points,
  color = 'var(--series-1)',
  xTitle,
  yTitle,
  formatX,
  formatY,
  trend,
  trendLabel = 'Least-squares trend',
  height = 300,
  radius = 2.2,
}: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const narrow = useIsNarrow();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeVersion = useThemeVersion();
  const { tip, setTip, hide, node } = useTooltip();

  const padLeft = narrow ? 46 : 58;
  const padRight = 14;
  const padTop = 12;
  const axisBand = 40;

  const plotWidth = Math.max(60, width - padLeft - padRight);
  const plotHeight = height - padTop - axisBand;

  const xMax = Math.max(1, ...points.map((p) => p.x));
  const yMax = Math.max(1, ...points.map((p) => p.y));
  const xTicks = niceTicks(xMax, narrow ? 3 : 5);
  const yTicks = niceTicks(yMax, 4);
  const xDomain = xTicks[xTicks.length - 1] || 1;
  const yDomain = yTicks[yTicks.length - 1] || 1;

  const x = linear([0, xDomain], [0, plotWidth]);
  const y = linear([0, yDomain], [plotHeight, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || plotWidth <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(plotWidth * dpr);
    canvas.height = Math.round(plotHeight * dpr);
    canvas.style.width = `${plotWidth}px`;
    canvas.style.height = `${plotHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, plotWidth, plotHeight);
    // Low alpha turns overplotting into a density read instead of a solid blob.
    ctx.fillStyle = resolveVar(color);
    ctx.globalAlpha = points.length > 2000 ? 0.28 : points.length > 400 ? 0.5 : 0.85;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(x(p.x), y(p.y), radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [points, plotWidth, plotHeight, color, radius, themeVersion, x, y]);

  const legend: LegendEntry[] = [
    { label: `Listings (${points.length.toLocaleString('en-US')})`, color },
    ...(trend ? [{ label: trendLabel, color: 'var(--text-primary)', line: true }] : []),
  ];

  const trendPath = trend
    ? (() => {
        const y0 = trend.intercept;
        const y1 = trend.intercept + trend.slope * xDomain;
        const clamp = (v: number) => Math.max(0, Math.min(yDomain, v));
        return `M${x(0)},${y(clamp(y0))} L${x(xDomain)},${y(clamp(y1))}`;
      })()
    : null;

  return (
    <div className="chart" ref={ref}>
      <Legend entries={legend} />
      {width > 0 && (
        <div style={{ position: 'relative', width, height }}>
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', left: padLeft, top: padTop }}
            aria-hidden="true"
          />
          <svg
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0 }}
            role="img"
            aria-label={`${yTitle} against ${xTitle}`}
            onMouseMove={(e) => {
              const box = ref.current!.getBoundingClientRect();
              const px = e.clientX - box.left - padLeft;
              const py = e.clientY - box.top - padTop;
              if (px < 0 || py < 0 || px > plotWidth || py > plotHeight) return hide();
              // Nearest point within a generous radius, so no pinpoint aiming.
              let best: Point | null = null;
              let bestDist = 18 * 18;
              for (const p of points) {
                const dx = x(p.x) - px;
                const dy = y(p.y) - py;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                  bestDist = d;
                  best = p;
                }
              }
              if (!best) return hide();
              setTip({
                x: x(best.x) + padLeft,
                y: y(best.y) + padTop,
                title: best.label ?? 'Listing',
                rows: [
                  { label: xTitle, value: formatX(best.x) },
                  { label: yTitle, value: formatY(best.y) },
                ],
              });
            }}
            onMouseLeave={hide}
          >
            <g transform={`translate(${padLeft},${padTop})`}>
              {yTicks.map((t) => (
                <Fragment key={t}>
                  <line className="gridline" x1={0} x2={plotWidth} y1={y(t)} y2={y(t)} />
                  <text
                    className="axis-label"
                    x={-8}
                    y={y(t)}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {formatY(t)}
                  </text>
                </Fragment>
              ))}

              {trendPath && (
                <path
                  d={trendPath}
                  stroke="var(--text-primary)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              )}

              {tip && (
                // 2px surface ring keeps the highlighted mark legible in the cloud.
                <circle
                  cx={tip.x - padLeft}
                  cy={tip.y - padTop}
                  r={5}
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              )}

              <line className="baseline" x1={0} x2={plotWidth} y1={plotHeight} y2={plotHeight} />
              <line className="baseline" x1={0} x2={0} y1={0} y2={plotHeight} />

              {xTicks.map((t) => (
                <text
                  key={t}
                  className="axis-label"
                  x={x(t)}
                  y={plotHeight + 15}
                  textAnchor="middle"
                >
                  {formatX(t)}
                </text>
              ))}
              <text className="axis-title" x={0} y={plotHeight + 31}>
                {xTitle}
              </text>
              <text
                className="axis-title"
                transform={`translate(${-padLeft + 11},${plotHeight / 2}) rotate(-90)`}
                textAnchor="middle"
              >
                {yTitle}
              </text>
            </g>
          </svg>
        </div>
      )}
      {node}
    </div>
  );
}
