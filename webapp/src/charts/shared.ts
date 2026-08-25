import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Charts render at measured pixel width rather than scaling a fixed viewBox,
 * so label type stays the same size on a phone as on a desktop.
 */
export function useMeasure<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      // Ignore sub-pixel jitter; it only causes re-render churn.
      setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

/** True when the viewport is narrow enough to warrant compact chart layouts. */
export function useIsNarrow(breakpoint = 560): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [breakpoint]);
  return narrow;
}

/* ------------------------------------------------------------------ */
/* Mark geometry                                                       */
/*                                                                     */
/* Bars carry a 4px rounded data-end and stay square at the baseline,   */
/* so the reader can always see where the measurement starts.           */
/* ------------------------------------------------------------------ */

export const BAR_RADIUS = 4;
/** Max bar thickness. The slot's leftover is deliberate air, not padding. */
export const BAR_MAX = 24;
/** Surface-coloured gap that separates touching marks. */
export const GAP = 2;

/** Horizontal bar growing rightwards from `x0`; rounded right end. */
export function hBarPath(x0: number, x1: number, y: number, h: number): string {
  const w = Math.max(0, x1 - x0);
  const r = Math.min(BAR_RADIUS, h / 2, w);
  if (w <= 0.5) return '';
  return [
    `M${x0},${y}`,
    `H${x0 + w - r}`,
    `A${r},${r} 0 0 1 ${x0 + w},${y + r}`,
    `V${y + h - r}`,
    `A${r},${r} 0 0 1 ${x0 + w - r},${y + h}`,
    `H${x0}`,
    'Z',
  ].join(' ');
}

/** Vertical column growing upwards from `yBase`; rounded cap. */
export function vBarPath(x: number, w: number, yTop: number, yBase: number): string {
  const h = Math.max(0, yBase - yTop);
  const r = Math.min(BAR_RADIUS, w / 2, h);
  if (h <= 0.5) return '';
  return [
    `M${x},${yBase}`,
    `V${yTop + r}`,
    `A${r},${r} 0 0 1 ${x + r},${yTop}`,
    `H${x + w - r}`,
    `A${r},${r} 0 0 1 ${x + w},${yTop + r}`,
    `V${yBase}`,
    'Z',
  ].join(' ');
}

/* ------------------------------------------------------------------ */
/* Palette access                                                      */
/*                                                                     */
/* Colours are read as CSS custom properties so the theme toggle swaps  */
/* them without the chart code knowing anything about light or dark.    */
/* ------------------------------------------------------------------ */

/** Categorical slots in fixed order. Index by entity, never by rank. */
export const SERIES = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
] as const;

/** Ordinal ramp, light -> dark. Only for genuinely ordered categories. */
export const ORDINAL = ['var(--ordinal-1)', 'var(--ordinal-2)', 'var(--ordinal-3)'] as const;

/** Four-step ordinal ramp for the cleaning funnel. */
export const FUNNEL = [
  'var(--funnel-1)',
  'var(--funnel-2)',
  'var(--funnel-3)',
  'var(--funnel-4)',
] as const;

/** Sequential ramp for continuous magnitude. */
export const SEQUENTIAL = [
  'var(--seq-100)',
  'var(--seq-250)',
  'var(--seq-400)',
  'var(--seq-550)',
  'var(--seq-700)',
] as const;

/** Resolve a `var(--x)` token to a concrete colour, for canvas drawing. */
export function resolveVar(token: string, el: Element = document.documentElement): string {
  const name = token.trim().replace(/^var\(\s*/, '').replace(/\s*\)$/, '');
  if (!name.startsWith('--')) return token;
  return getComputedStyle(el).getPropertyValue(name).trim() || token;
}

/* ------------------------------------------------------------------ */
/* Ink on coloured fills                                               */
/* ------------------------------------------------------------------ */

/** #rgb or #rrggbb to [r, g, b]. */
export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/**
 * A label set inside a coloured fill picks white or near-black by whichever
 * actually contrasts — the one place text is allowed to sit on a series colour,
 * and the only way it stays legible in both themes.
 */
export function pickInk(background: string): string {
  const lum = relativeLuminance(parseHex(background));
  const onWhite = 1.05 / (lum + 0.05);
  const onBlack = (lum + 0.05) / 0.05;
  return onBlack >= onWhite ? '#0b0b0b' : '#ffffff';
}

/** Blend two hex colours in sRGB. `t` of 0 returns `a`, 1 returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const [r0, g0, b0] = parseHex(a);
  const [r1, g1, b1] = parseHex(b);
  const to = (x: number, y: number) => Math.round(x + (y - x) * t);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(to(r0, r1))}${hex(to(g0, g1))}${hex(to(b0, b1))}`;
}

/** Fires whenever the effective theme changes, so canvases can repaint. */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', bump);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', bump);
    };
  }, []);
  return version;
}

/* ------------------------------------------------------------------ */
/* Scales                                                              */
/* ------------------------------------------------------------------ */

export interface LinearScale {
  (value: number): number;
  domain: [number, number];
  range: [number, number];
}

export function linear(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const fn = ((v: number) => r0 + ((v - d0) / span) * (r1 - r0)) as LinearScale;
  fn.domain = domain;
  fn.range = range;
  return fn;
}

/** Truncate a label to fit a pixel budget, at roughly 6.2px per character. */
export function ellipsize(text: string, maxPx: number, perChar = 6.2): string {
  const maxChars = Math.floor(maxPx / perChar);
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}
