import { useCallback, useId, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

interface CardProps {
  title: string;
  subtitle?: string;
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  /** Rendered at the top-right — usually the chart/table view toggle. */
  action?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, span = 12, action, note, children }: CardProps) {
  return (
    <section className={`card${span === 12 ? '' : ` card--${span}`}`}>
      <div className="card__head">
        <div>
          <h3 className="card__title">{title}</h3>
          {subtitle && <p className="card__sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="card__body">{children}</div>
      {note && <div className="card__note">{note}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Chart / table view switch                                           */
/*                                                                     */
/* Every chart ships a table twin so no value is reachable only by      */
/* colour or only by hovering.                                         */
/* ------------------------------------------------------------------ */

export type View = 'chart' | 'table';

export function useView(): [View, ReactNode] {
  const [view, setView] = useState<View>('chart');
  const label = useId();
  const control = (
    <div className="viewtoggle" role="group" aria-labelledby={label}>
      <span className="visually-hidden" id={label}>
        Display as
      </span>
      <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
        Chart
      </button>
      <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
        Table
      </button>
    </div>
  );
  return [view, control];
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/*                                                                     */
/* Present whenever two or more series share a plot — identity is never */
/* carried by colour alone.                                            */
/* ------------------------------------------------------------------ */

export interface LegendEntry {
  label: string;
  color: string;
  /** A line key instead of a filled swatch (trend lines, references). */
  line?: boolean;
}

export function Legend({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul className="legend" style={{ listStyle: 'none', padding: 0 }}>
      {entries.map((e) => (
        <li className="legend__item" key={e.label}>
          <span
            className={`legend__swatch${e.line ? ' legend__swatch--line' : ''}`}
            style={{ background: e.color }}
            aria-hidden="true"
          />
          {e.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

export interface TipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string }[];
}

export function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const hide = useCallback(() => setTip(null), []);
  const node = tip ? (
    <div className="tooltip" style={{ left: `${tip.x}px`, top: `${tip.y}px` }} role="status">
      <div className="tooltip__title">{tip.title}</div>
      {tip.rows.map((r) => (
        <div className="tooltip__row" key={r.label}>
          {r.label}: <b>{r.value}</b>
        </div>
      ))}
    </div>
  ) : null;
  return { tip, setTip, hide, node };
}

/* ------------------------------------------------------------------ */
/* Stat tiles & hero figure                                            */
/* ------------------------------------------------------------------ */

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="tile">
      <div className="tile__label">{label}</div>
      {/* Proportional figures: tabular-nums makes large numbers look loose. */}
      <div className="tile__value">{value}</div>
      {hint && <div className="tile__hint">{hint}</div>}
    </div>
  );
}

export function Hero({
  figure,
  label,
  children,
}: {
  figure: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="hero">
      <div className="hero__figure">{figure}</div>
      <div className="hero__body">
        <div className="hero__label">{label}</div>
        <p>{children}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Finding callout                                                     */
/* ------------------------------------------------------------------ */

export type FindingTone = 'good' | 'warning' | 'critical' | 'neutral';

const TONE_COLOR: Record<FindingTone, string> = {
  good: 'var(--good)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
  neutral: 'var(--text-muted)',
};

/** Status colour never travels alone — each icon ships with its label. */
function ToneIcon({ tone }: { tone: FindingTone }) {
  const c = TONE_COLOR[tone];
  if (tone === 'good') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke={c} strokeWidth="1.6" />
        <path
          d="M4.8 8.2l2.1 2.1 4.3-4.4"
          fill="none"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === 'neutral') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke={c} strokeWidth="1.6" />
        <path d="M8 4.4v.2M8 7v4.6" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.7l6.4 11.1H1.6L8 1.7z"
        fill="none"
        stroke={c}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 6v3.1M8 11.2v.2" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const TONE_LABEL: Record<FindingTone, string> = {
  good: 'Supported',
  warning: 'Watch',
  critical: 'Risk',
  neutral: 'Note',
};

export function Finding({
  tone = 'neutral',
  children,
}: {
  tone?: FindingTone;
  children: ReactNode;
}) {
  return (
    <div className="finding">
      <span className="finding__icon">
        <ToneIcon tone={tone} />
      </span>
      <p className="finding__text">
        <span className="visually-hidden">{TONE_LABEL[tone]}: </span>
        {children}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data table — the chart twin                                         */
/* ------------------------------------------------------------------ */

export interface TableColumn<T> {
  header: string;
  /** Cell content; numeric columns are right-aligned by the stylesheet. */
  cell: (row: T) => ReactNode;
  /** Prose columns read badly flush right — opt them back to the left. */
  align?: 'left' | 'right';
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
}) {
  if (!rows.length) {
    return <p className="empty">No listings match the current filters.</p>;
  }
  return (
    <div className="tablewrap" tabIndex={0}>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" style={c.align ? { textAlign: c.align } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {columns.map((c, j) =>
                j === 0 ? (
                  <th key={c.header} scope="row" style={{ position: 'static', background: 'none', textAlign: 'left', fontWeight: 400, padding: '7px 12px', borderBottom: '1px solid var(--grid)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {c.cell(r)}
                  </th>
                ) : (
                  <td key={c.header} style={c.align ? { textAlign: c.align } : undefined}>
                    {c.cell(r)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Colour key beside a table label, so the table carries the same identity. */
export function SwatchLabel({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="swatch-cell">
      <span className="legend__swatch" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  );
}

export function EmptyState() {
  return <p className="empty">No listings match the current filters. Try widening them.</p>;
}
