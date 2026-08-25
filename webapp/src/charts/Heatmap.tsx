import { Fragment, useEffect, useState } from 'react';
import { useTooltip } from '../components/ui';
import { dec } from '../lib/format';
import {
  GAP,
  ellipsize,
  mixHex,
  pickInk,
  resolveVar,
  useIsNarrow,
  useMeasure,
  useThemeVersion,
} from './shared';

interface Props {
  labels: string[];
  /** Square matrix of Spearman coefficients in [-1, 1]. */
  matrix: number[][];
}

/**
 * Correlation matrix on a diverging scale: blue for positive, red for
 * negative, neutral gray at zero — so "no relationship" reads as nothing.
 */
export function Heatmap({ labels, matrix }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const narrow = useIsNarrow();
  const { setTip, hide, node } = useTooltip();
  const themeVersion = useThemeVersion();

  // The diverging stops are blended here rather than by color-mix(), so the
  // label ink can be chosen from the fill that actually lands on screen.
  const [stops, setStops] = useState({ pos: '#2a78d6', neg: '#d03b3b', mid: '#f0efec' });
  useEffect(() => {
    setStops({
      pos: resolveVar('var(--diverge-pos)'),
      neg: resolveVar('var(--diverge-neg)'),
      mid: resolveVar('var(--diverge-mid)'),
    });
  }, [themeVersion]);

  const gutter = narrow ? 84 : 132;
  const topBand = narrow ? 54 : 40;
  const padRight = 4;

  const n = labels.length;
  const cell = Math.max(28, Math.min(76, (width - gutter - padRight) / n));
  const height = topBand + n * cell + 6;

  /** Mix strength from |r|; blue above zero, red below, gray at the midpoint. */
  const fill = (r: number) =>
    mixHex(stops.mid, r >= 0 ? stops.pos : stops.neg, Math.min(1, Math.abs(r)));

  const ink = (r: number) => pickInk(fill(r));

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Correlation matrix">
          {labels.map((l, j) => (
            <text
              key={l}
              className="axis-label"
              x={gutter + j * cell + cell / 2}
              y={topBand - 12}
              textAnchor={narrow ? 'start' : 'middle'}
              transform={
                narrow
                  ? `rotate(-38 ${gutter + j * cell + cell / 2} ${topBand - 12})`
                  : undefined
              }
            >
              {ellipsize(l, narrow ? 70 : cell - 4, 5.6)}
            </text>
          ))}

          {matrix.map((row, i) => (
            <Fragment key={labels[i]}>
              <text
                className="cat-label"
                x={gutter - 10}
                y={topBand + i * cell + cell / 2}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {ellipsize(labels[i], gutter - 14, narrow ? 5.9 : 6.3)}
              </text>
              {row.map((r, j) => (
                <Fragment key={labels[j]}>
                  <rect
                    x={gutter + j * cell + GAP / 2}
                    y={topBand + i * cell + GAP / 2}
                    width={cell - GAP}
                    height={cell - GAP}
                    rx="3"
                    fill={fill(r)}
                  />
                  <text
                    x={gutter + j * cell + cell / 2}
                    y={topBand + i * cell + cell / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      fill: ink(r),
                    }}
                  >
                    {dec(r, 2)}
                  </text>
                  <rect
                    className="hit"
                    x={gutter + j * cell}
                    y={topBand + i * cell}
                    width={cell}
                    height={cell}
                    onMouseMove={(e) => {
                      const box = ref.current!.getBoundingClientRect();
                      setTip({
                        x: e.clientX - box.left,
                        y: e.clientY - box.top,
                        title: `${labels[i]} × ${labels[j]}`,
                        rows: [{ label: 'Spearman rho', value: dec(r, 3) }],
                      });
                    }}
                    onMouseLeave={hide}
                  />
                </Fragment>
              ))}
            </Fragment>
          ))}
        </svg>
      )}
      <div className="scale-legend">
        <span>−1</span>
        <span
          className="scale-legend__ramp"
          style={{
            background:
              'linear-gradient(to right, var(--diverge-neg), var(--diverge-mid), var(--diverge-pos))',
          }}
          aria-hidden="true"
        />
        <span>+1</span>
        <span style={{ marginLeft: 4 }}>Spearman rank correlation</span>
      </div>
      {node}
    </div>
  );
}
