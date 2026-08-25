/**
 * Rebuilds the app's data payload from the raw Airbnb export.
 *
 * This is a line-for-line port of the cleaning pipeline in EDA_AirBNB.ipynb
 * (sections II.1 - II.3). Row counts are asserted against the notebook's
 * printed outputs so the dashboard can never silently drift from the analysis.
 *
 *   raw CSV                    15853 rows
 *   -> drop listings w/o reviews 10063
 *   -> price < 2000 THB         10064 -> ...
 *   -> availability_365 > 0      6619 rows   <- final
 *
 * Usage: node scripts/build-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const RAW_CSV = resolve(here, '../../data/Airbnb Listings Bangkok.csv');
const OUT_DIR = resolve(here, '../src/data');

/* ------------------------------------------------------------------ */
/* CSV parsing                                                         */
/* ------------------------------------------------------------------ */

/** RFC-4180 parser. Listing names contain commas and escaped quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const raw = readFileSync(RAW_CSV, 'utf8');
const table = parseCsv(raw);
const header = table[0];
const col = Object.fromEntries(header.map((h, i) => [h, i]));

const num = (v) => (v === '' ? null : Number(v));

/** Fails the build loudly if a count no longer matches the notebook. */
const expect = (label, actual, wanted) => {
  if (actual !== wanted) {
    throw new Error(
      `Pipeline drift: ${label} is ${actual}, notebook recorded ${wanted}. ` +
        `Re-check the cleaning steps before shipping.`,
    );
  }
};

let df = table.slice(1)
  .filter((r) => r.length === header.length)
  .map((r) => ({
    // Newer Airbnb ids run past 2^53, so Number() would corrupt them. Keep the text.
    id: r[col.id],
    name: r[col.name],
    host_id: Number(r[col.host_id]),
    host_name: r[col.host_name],
    neighbourhood: r[col.neighbourhood],
    latitude: Number(r[col.latitude]),
    longitude: Number(r[col.longitude]),
    room_type: r[col.room_type],
    price: Number(r[col.price]),
    minimum_nights: Number(r[col.minimum_nights]),
    number_of_reviews: Number(r[col.number_of_reviews]),
    last_review: r[col.last_review],
    reviews_per_month: num(r[col.reviews_per_month]),
    calculated_host_listings_count: Number(r[col.calculated_host_listings_count]),
    availability_365: Number(r[col.availability_365]),
    number_of_reviews_ltm: Number(r[col.number_of_reviews_ltm]),
  }));

// The notebook's df.info() reports 15854 entries; README's "15853" is the last index.
const funnel = [{ step: 'Raw export', rows: df.length }];
expect('raw row count', df.length, 15854);

/* ------------------------------------------------------------------ */
/* Cleaning part 1 - missing values, dtypes                            */
/* ------------------------------------------------------------------ */

// df['name'].fillna('No name'); df['host_name'].fillna('Unknown')
for (const r of df) {
  if (!r.name) r.name = 'No name';
  if (!r.host_name) r.host_name = 'Unknown';
}

// df.dropna() -- only last_review / reviews_per_month can still be null,
// and both are null exactly when the listing has never been reviewed.
df = df.filter((r) => r.last_review !== '' && r.reviews_per_month !== null);
funnel.push({ step: 'Has at least one review', rows: df.length });

/* ------------------------------------------------------------------ */
/* Cleaning part 2 - outliers                                          */
/* ------------------------------------------------------------------ */

// Budget-traveller ceiling: TripAdvisor puts backpacker lodging under 2000 THB.
df = df.filter((r) => r.price < 2000);
funnel.push({ step: 'Budget price < 2000 THB', rows: df.length });

// availability_365 == 0 carries no signal about booking behaviour.
df = df.filter((r) => r.availability_365 !== 0);
funnel.push({ step: 'Bookable in next 365 days', rows: df.length });

/* ------------------------------------------------------------------ */
/* Cleaning part 3 - derived segments                                  */
/* ------------------------------------------------------------------ */

// host_type is computed on the *filtered* frame, matching the notebook.
const hostCounts = new Map();
for (const r of df) hostCounts.set(r.host_id, (hostCounts.get(r.host_id) ?? 0) + 1);
for (const r of df) {
  r.host_type = hostCounts.get(r.host_id) === 1 ? 'Single-listing' : 'Multi-listing';
}

const segmentPrice = (p) =>
  p < 500 ? 'Low-end Budget' : p < 1000 ? 'Mid-range Budget' : 'Upper-end Budget';
for (const r of df) r.price_segment = segmentPrice(r.price);

// reviews_segment splits on the median of reviews_per_month.
const rpmSorted = df.map((r) => r.reviews_per_month).sort((a, b) => a - b);
const median = (arr) => {
  if (!arr.length) return 0;
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
};
const rpmMedian = median(rpmSorted);
for (const r of df) {
  r.reviews_segment = r.reviews_per_month > rpmMedian ? 'High review' : 'Low review';
}

/* ------------------------------------------------------------------ */
/* Guardrails against drift                                            */
/* ------------------------------------------------------------------ */

const tally = (key) =>
  df.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] ?? 0) + 1), acc), {});

expect('final row count', df.length, 6619);
expect('rows after dropna', funnel[1].rows, 10064);
expect('unique hosts', new Set(df.map((r) => r.host_id)).size, 2829);
const rt = tally('room_type');
expect('Entire home/apt', rt['Entire home/apt'], 4035);
expect('Private room', rt['Private room'], 2131);
expect('Hotel room', rt['Hotel room'], 257);
expect('Shared room', rt['Shared room'], 196);
const ht = tally('host_type');
expect('Multi-listing', ht['Multi-listing'], 4768);
expect('Single-listing', ht['Single-listing'], 1851);
const ps = tally('price_segment');
expect('Upper-end Budget', ps['Upper-end Budget'], 3722);
expect('Mid-range Budget', ps['Mid-range Budget'], 2491);
expect('Low-end Budget', ps['Low-end Budget'], 406);

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

// Columnar-ish tuple encoding keeps the payload ~5x smaller than objects.
// Field order is mirrored by decodeListings() in src/data/listings.ts.
const ROOM_TYPES = ['Entire home/apt', 'Private room', 'Hotel room', 'Shared room'];
const NEIGHBOURHOODS = [...new Set(df.map((r) => r.neighbourhood))].sort();
const roomIdx = new Map(ROOM_TYPES.map((v, i) => [v, i]));
const hoodIdx = new Map(NEIGHBOURHOODS.map((v, i) => [v, i]));

const round = (v, p) => Math.round(v * 10 ** p) / 10 ** p;

const rows = df.map((r) => [
  r.id,
  hoodIdx.get(r.neighbourhood),
  roomIdx.get(r.room_type),
  round(r.latitude, 5),
  round(r.longitude, 5),
  r.price,
  r.minimum_nights,
  r.number_of_reviews,
  r.number_of_reviews_ltm,
  round(r.reviews_per_month, 2),
  r.availability_365,
  r.host_type === 'Multi-listing' ? 1 : 0,
  r.last_review.slice(0, 7), // YYYY-MM is enough for recency
]);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  resolve(OUT_DIR, 'listings.json'),
  JSON.stringify({ roomTypes: ROOM_TYPES, neighbourhoods: NEIGHBOURHOODS, rows }),
);

writeFileSync(
  resolve(OUT_DIR, 'pipeline.json'),
  JSON.stringify({ funnel, rpmMedian: round(rpmMedian, 2) }, null, 2),
);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`✓ ${df.length} listings -> src/data/listings.json`);
console.log(`  payload ${kb(JSON.stringify({ rows }).length)}`);
console.log(`  reviews_per_month median = ${round(rpmMedian, 2)}`);
console.log(`  funnel: ${funnel.map((f) => `${f.step} ${f.rows}`).join(' | ')}`);
