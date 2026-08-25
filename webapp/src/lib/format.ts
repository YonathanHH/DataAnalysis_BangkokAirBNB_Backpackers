/** Number and label formatting shared by every chart, tile and table. */

export const int = (n: number): string => Math.round(n).toLocaleString('en-US');

export const dec = (n: number, places = 2): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });

export const thb = (n: number): string => `฿${int(n)}`;

export const pct = (n: number, places = 1): string => `${dec(n * 100, places)}%`;

/** Compact form for tile values: 1,284 / 12.9K / 1.2M. */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${dec(n / 1_000_000, 1)}M`;
  if (abs >= 10_000) return `${dec(n / 1000, 1)}K`;
  return int(n);
}

/** p-values below the float noise floor print as an inequality, as SciPy's do. */
export const pValue = (p: number): string => (p < 0.0001 ? 'p < 0.0001' : `p = ${dec(p, 4)}`);

export const signed = (n: number, places = 3): string =>
  `${n >= 0 ? '+' : '\u2212'}${dec(Math.abs(n), places)}`;

/**
 * Axis ticks at clean intervals (1/2/5 x 10^k) spanning [0, max].
 *
 * The last tick is rounded *up* past `max`, never down — callers use it as the
 * scale's domain, so stopping short would let a bar run off the end of its own
 * axis.
 */
export function niceTicks(max: number, target = 5): number[] {
  if (max <= 0) return [0, 1];
  const rawStep = max / target;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step * 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}
