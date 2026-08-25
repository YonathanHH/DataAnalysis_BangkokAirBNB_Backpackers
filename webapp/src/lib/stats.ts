/**
 * Aggregation and inferential helpers.
 *
 * The Spearman / ANOVA / chi-square implementations mirror the SciPy calls in
 * EDA_AirBNB.ipynb so the dashboard re-computes the same tests live against
 * whatever slice the reader has filtered to. Against the unfiltered frame they
 * reproduce the notebook's printed statistics.
 */

export const mean = (xs: readonly number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export const median = (xs: readonly number[]): number =>
  quantile([...xs].sort((a, b) => a - b), 0.5);

export interface FiveNumber {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  n: number;
}

export function fiveNumber(xs: readonly number[]): FiveNumber {
  const s = [...xs].sort((a, b) => a - b);
  return {
    min: s[0] ?? 0,
    q1: quantile(s, 0.25),
    median: quantile(s, 0.5),
    q3: quantile(s, 0.75),
    max: s[s.length - 1] ?? 0,
    n: s.length,
  };
}

/** Average ranks, ties shared — the same convention SciPy's rankdata uses. */
function rank(xs: readonly number[]): number[] {
  const order = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(xs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k].i] = shared;
    i = j + 1;
  }
  return out;
}

function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  if (n < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export interface TestResult {
  stat: number;
  p: number;
  n: number;
}

/**
 * Spearman rank correlation with a t-approximation for the p-value — the same
 * asymptotic SciPy reports for n in the thousands.
 */
export function spearman(a: readonly number[], b: readonly number[]): TestResult {
  const n = a.length;
  if (n < 3) return { stat: 0, p: 1, n };
  const rho = pearson(rank(a), rank(b));
  const denom = 1 - rho * rho;
  if (denom <= 0) return { stat: rho, p: 0, n };
  const t = rho * Math.sqrt((n - 2) / denom);
  return { stat: rho, p: 2 * studentTSf(Math.abs(t), n - 2), n };
}

/** One-way ANOVA across k groups (SciPy's f_oneway). */
export function anova(groups: readonly (readonly number[])[]): TestResult & { k: number } {
  const usable = groups.filter((g) => g.length > 0);
  const k = usable.length;
  const n = usable.reduce((a, g) => a + g.length, 0);
  if (k < 2 || n <= k) return { stat: 0, p: 1, n, k };

  const grand = mean(usable.flat());
  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of usable) {
    const m = mean(g);
    ssBetween += g.length * (m - grand) ** 2;
    for (const v of g) ssWithin += (v - m) ** 2;
  }
  const dfB = k - 1;
  const dfW = n - k;
  if (ssWithin === 0) return { stat: Infinity, p: 0, n, k };
  const f = ssBetween / dfB / (ssWithin / dfW);
  return { stat: f, p: fSf(f, dfB, dfW), n, k };
}

/**
 * Chi-square test of independence on an r x c contingency table.
 *
 * Yates' continuity correction is applied to 2x2 tables, matching the default
 * of SciPy's `chi2_contingency`. Without it this returns 159.70 where the
 * notebook printed 159.01.
 */
export function chiSquare(table: readonly (readonly number[])[]): TestResult & { df: number } {
  const rows = table.length;
  const cols = table[0]?.length ?? 0;
  const rowSums = table.map((r) => r.reduce((a, b) => a + b, 0));
  const colSums = Array.from({ length: cols }, (_, j) =>
    table.reduce((a, r) => a + r[j], 0),
  );
  const total = rowSums.reduce((a, b) => a + b, 0);
  const df = (rows - 1) * (cols - 1);
  if (!total || df < 1) return { stat: 0, p: 1, n: total, df };

  const yates = rows === 2 && cols === 2;
  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowSums[i] * colSums[j]) / total;
      if (expected <= 0) continue;
      const deviation = Math.abs(table[i][j] - expected);
      const adjusted = yates ? Math.max(0, deviation - 0.5) : deviation;
      chi2 += (adjusted * adjusted) / expected;
    }
  }
  return { stat: chi2, p: chiSquareSf(chi2, df), n: total, df };
}

/* ------------------------------------------------------------------ */
/* Distribution tails                                                  */
/*                                                                     */
/* Lanczos log-gamma plus a continued-fraction incomplete beta — the    */
/* standard Numerical-Recipes pair, good to ~1e-12 over the range these */
/* tests produce.                                                      */
/* ------------------------------------------------------------------ */

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i + 1);
  const t = z + LANCZOS.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Continued fraction for the regularised incomplete beta (Lentz's method). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const TINY = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Upper tail of Student's t. */
function studentTSf(t: number, df: number): number {
  if (df <= 0) return 1;
  return 0.5 * incompleteBeta(df / 2, 0.5, df / (df + t * t));
}

/** Upper tail of the F distribution. */
function fSf(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  if (!Number.isFinite(f)) return 0;
  return incompleteBeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
}

/** Regularised lower incomplete gamma P(s, x) — series and CF branches. */
function lowerGamma(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    let sum = 1 / s;
    let term = sum;
    for (let n = 1; n < 500; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }
  // Continued fraction for the upper tail, then complement.
  const TINY = 1e-30;
  let b = x + 1 - s;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

/** Upper tail of chi-square. */
function chiSquareSf(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  return 1 - lowerGamma(df / 2, chi2 / 2);
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

export function groupBy<T, K extends string>(
  rows: readonly T[],
  key: (row: T) => K,
): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/** Equal-width histogram bins over [min, max]. */
export function histogram(
  xs: readonly number[],
  binCount: number,
): { x0: number; x1: number; count: number }[] {
  if (!xs.length) return [];
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of xs) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[idx].count++;
  }
  return bins;
}

/** Ordinary least squares fit, for the trend line on scatter plots. */
export function linearFit(
  xs: readonly number[],
  ys: readonly number[],
): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}
