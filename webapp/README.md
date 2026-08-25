# Bangkok Backpacker Index — web app

An interactive dashboard built on `EDA_AirBNB.ipynb`. Vite + React + TypeScript,
no chart library, no runtime dependencies beyond React.

## Why it is not just a screenshot of the notebook

The notebook's numbers are reproduced rather than copied. `scripts/build-data.mjs`
re-runs the notebook's cleaning pipeline against the raw CSV at build time and
**fails the build** if any stage stops matching the row counts the notebook
printed:

```
raw export                 15,854
has at least one review    10,064
budget price < ฿2,000       7,039
bookable in next 365 days   6,619   <- the analysed frame
```

Every statistical test is then reimplemented in `src/lib/stats.ts` and
**recomputed in the browser** against whatever slice the reader has filtered to.
`scripts/verify-stats.mts` asserts that, on the unfiltered frame, those live
figures reproduce SciPy's to three or four decimals — including Yates'
continuity correction on the 2×2 chi-square, which the notebook's
`chi2_contingency` applies by default.

```
spearman rpm~price rho          0.1643   notebook 0.164
spearman minNights~rpm rho      -0.0812  notebook -0.081
spearman avail~ltm rho          -0.1965  notebook -0.197
ANOVA price segment F          62.8991   notebook 62.899   (p 8.704e-28)
Chi-square host x review      159.0071   notebook 159.007
spearman districts count~price  0.4856   notebook 0.486
ANOVA top-10 districts F        2.4942   notebook 2.494
```

That check runs on every build, so a filtered figure can be trusted for the same
reason the unfiltered one can.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Rebuild the data payload, then start Vite on :5173 |
| `npm run build` | Data → stats verification → typecheck → production bundle |
| `npm run verify` | Just the statistics check against the notebook's values |
| `npm run data` | Just regenerate `src/data/listings.json` from the raw CSV |
| `npm run preview` | Serve the built `dist/` locally |

`npm run build` is the gate: it will not produce a bundle if the cleaning
pipeline drifts or the statistics stop matching.

## Layout

```
scripts/
  build-data.mjs      Cleaning pipeline port + row-count assertions
  verify-stats.mts    Live statistics vs the notebook's SciPy output
src/
  data/               Generated payload + the notebook's published findings
  lib/                Data decoding, filtering, statistics, formatting
  charts/             Hand-built SVG/canvas charts (bar, box, scatter,
                      histogram, stacked, heatmap, map)
  components/         Card, table, legend, tooltip, filter bar
  sections/           One module per tab
```

Charts are hand-built rather than pulled from a library so the mark specs hold
exactly — 24px bar cap, 4px rounded data-ends square at the baseline, 2px
surface gaps between touching fills, hairline solid gridlines. Dense clouds
(6,619 listings, the map) render to canvas with a nearest-point hover layer;
everything else is SVG.

## Design constraints worth knowing before editing

- **Colour is assigned by entity, never by rank.** Room types always take the
  same categorical slots, so filtering never repaints the survivors.
- **Ordered categories get the ordinal ramp; nominal ones get a single hue.**
  A value-ramp across nominal bars would double-encode bar length as colour.
- The categorical, ordinal and diverging palettes were each validated for
  colour-vision separation and surface contrast in both light and dark.
- **Every chart has a table twin** via the Chart/Table toggle, so no value is
  reachable only by colour or only by hovering.
- Dark mode is defined three times on purpose — bare `:root` for light, a
  `prefers-color-scheme` block for the OS setting, and a `[data-theme]` block so
  the in-app toggle wins in both directions.

## Deployment

The repository root carries `vercel.json`, so importing the repo into Vercel
needs no configuration — leave Root Directory as the repository root and deploy.
The build reads `data/Airbnb Listings Bangkok.csv` from the repo, which is why
the root, not `webapp/`, is the build context.

```bash
npx vercel        # preview deployment
npx vercel --prod # production
```

## A correction to the notebook

The notebook concludes that shared rooms invert the price/velocity
relationship — cheaper shared rooms booking faster. That was read off a seaborn
regression line and never tested. Tested directly it does not hold:
**rho = −0.09, p = 0.21** at n = 196. The significant inversion is in private
rooms instead (rho = −0.059, p = 0.007), and it is very small. The Pricing and
Method tabs say so.
