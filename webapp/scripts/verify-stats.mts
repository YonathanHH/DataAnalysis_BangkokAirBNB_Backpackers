import { readFileSync } from 'node:fs';
import { anova, chiSquare, spearman } from '../src/lib/stats.ts';

const raw = JSON.parse(
  readFileSync(
    new URL('../src/data/listings.json', import.meta.url),
    'utf8',
  ),
);
const R = raw.rows as number[][];
const col = (i: number) => R.map((r) => r[i]);
const price = col(5), minN = col(6), reviews = col(7), ltm = col(8), rpm = col(9), avail = col(10);
const multi = col(11);
const roomIdx = col(2);

const rpmSorted = [...rpm].sort((a, b) => a - b);
const med = rpmSorted.length % 2 ? rpmSorted[(rpmSorted.length - 1) / 2]
  : (rpmSorted[rpmSorted.length / 2 - 1] + rpmSorted[rpmSorted.length / 2]) / 2;

const seg = (p: number) => (p < 500 ? 0 : p < 1000 ? 1 : 2);

const check = (name: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} got ${got.toFixed(4).padStart(11)}  notebook ${want}`);
  return ok;
};

let allOk = true;
const t = (n: string, g: number, w: number, tol: number) => { allOk = check(n, g, w, tol) && allOk; };

t('spearman rpm~price rho', spearman(rpm, price).stat, 0.164, 0.001);
t('spearman reviews~price rho', spearman(reviews, price).stat, 0.071, 0.001);
t('spearman ltm~price rho', spearman(ltm, price).stat, 0.161, 0.001);
t('spearman minNights~rpm rho', spearman(minN, rpm).stat, -0.081, 0.001);
t('spearman avail~ltm rho', spearman(avail, ltm).stat, -0.197, 0.001);

const groups: number[][] = [[], [], []];
R.forEach((r) => groups[seg(r[5])].push(r[9]));
const a = anova(groups);
t('ANOVA price segment F', a.stat, 62.899, 0.01);
console.log(`      ANOVA p = ${a.p.toExponential(3)} (notebook 8.704e-28)`);

// Chi-square: host type x review performance.
// The notebook brackets the median from both sides, so ties fall in neither group.
let hs = 0, hm = 0, ls = 0, lm = 0;
R.forEach((r) => {
  const isMulti = r[11] === 1;
  if (r[9] > med) { if (isMulti) hm++; else hs++; }
  else if (r[9] < med) { if (isMulti) lm++; else ls++; }
});
const c = chiSquare([[hs, hm], [ls, lm]]);
t('Chi-square host x review', c.stat, 159.007, 0.01);

// Neighbourhood density vs avg price (49 districts)
const byHood = new Map<number, number[]>();
R.forEach((r) => {
  const k = r[1];
  if (!byHood.has(k)) byHood.set(k, []);
  byHood.get(k)!.push(r[5]);
});
const counts = [...byHood.values()].map((v) => v.length);
const avgs = [...byHood.values()].map((v) => v.reduce((x, y) => x + y, 0) / v.length);
const dv = spearman(counts, avgs);
t('spearman districts count~price', dv.stat, 0.486, 0.001);
console.log(`      p = ${dv.p.toFixed(4)} (notebook 0.0004)`);

// ANOVA across top-10 neighbourhoods by mean rpm (notebook's ranking, no min-n floor)
const rpmByHood = new Map<number, number[]>();
R.forEach((r) => {
  if (!rpmByHood.has(r[1])) rpmByHood.set(r[1], []);
  rpmByHood.get(r[1])!.push(r[9]);
});
const top10 = [...rpmByHood.entries()]
  .map(([k, v]) => [k, v.reduce((x, y) => x + y, 0) / v.length] as const)
  .sort((x, y) => y[1] - x[1])
  .slice(0, 10)
  .map(([k]) => k);
const na = anova(top10.map((k) => rpmByHood.get(k)!));
t('ANOVA top-10 districts F', na.stat, 2.494, 0.01);
console.log(`      p = ${na.p.toFixed(4)} (notebook 0.0077)`);

console.log(`\nvalues used: rpm median ${med}, room types ${new Set(roomIdx).size}, multi ${multi.filter((x) => x === 1).length}`);
console.log(allOk ? '\nALL STATS MATCH THE NOTEBOOK' : '\nMISMATCHES PRESENT');
process.exit(allOk ? 0 : 1);
