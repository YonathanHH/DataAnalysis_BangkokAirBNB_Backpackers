/**
 * Extracts Bangkok's district boundaries from the bundled ESRI shapefile into a
 * compact JSON the map can draw.
 *
 * A .shp holds the geometry on its own. The missing sidecars only cost us the
 * .shx record index -- which matters just for random access, and this walks the
 * records in order -- and the .dbf attribute table, which is where the district
 * *names* live. So the outlines are recoverable; the labels are not, and the
 * map keeps naming districts from the listing data instead.
 *
 * Usage: node scripts/build-geo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SHP = resolve(here, '../../data/bangkok_district.shp');
const OUT_DIR = resolve(here, '../src/data');

const SHAPE_POLYGON = 5;
/**
 * Vertex drop tolerance in degrees. The map draws the city about 1000px wide
 * across ~0.61deg of longitude, so one pixel is ~0.0006deg. At 0.0002deg no
 * discarded vertex can move an edge by even half a pixel.
 */
const TOLERANCE = 0.0002;
/** 4dp is ~11m at this latitude -- still well under a pixel. */
const PRECISION = 4;

/* ------------------------------------------------------------------ */
/* Shapefile reader                                                    */
/* ------------------------------------------------------------------ */

const buf = readFileSync(SHP);

if (buf.readInt32BE(0) !== 9994) {
  throw new Error(`${SHP} is not a shapefile (bad magic number).`);
}
// The header stores its own length in 16-bit words; a mismatch means truncation.
const declared = buf.readInt32BE(24) * 2;
if (declared !== buf.length) {
  throw new Error(`Truncated shapefile: header declares ${declared} bytes, file has ${buf.length}.`);
}

/** Walk the record list sequentially, which is what removes the need for .shx. */
function readRings() {
  const rings = [];
  let offset = 100; // past the file header

  while (offset < buf.length) {
    const contentLength = buf.readInt32BE(offset + 4) * 2;
    const content = offset + 8;
    const type = buf.readInt32LE(content);

    if (type === SHAPE_POLYGON) {
      const numParts = buf.readInt32LE(content + 36);
      const numPoints = buf.readInt32LE(content + 40);
      const partsAt = content + 44;
      const pointsAt = partsAt + numParts * 4;

      for (let p = 0; p < numParts; p++) {
        const start = buf.readInt32LE(partsAt + p * 4);
        const end = p + 1 < numParts ? buf.readInt32LE(partsAt + (p + 1) * 4) : numPoints;
        const ring = [];
        for (let i = start; i < end; i++) {
          const at = pointsAt + i * 16;
          ring.push([buf.readDoubleLE(at), buf.readDoubleLE(at + 8)]); // lon, lat
        }
        rings.push(ring);
      }
    }
    offset = content + contentLength;
  }
  return rings;
}

/* ------------------------------------------------------------------ */
/* Simplification                                                      */
/* ------------------------------------------------------------------ */

/** Perpendicular distance from p to the segment ab, in degrees. */
function pointToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Douglas-Peucker. Iterative rather than recursive: a few of these rings run to
 * several hundred vertices and a pathological split order could blow the stack.
 */
function simplify(ring, tolerance) {
  if (ring.length < 3) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let worst = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = pointToSegment(ring[i], ring[first], ring[last]);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (index !== -1 && worst > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const raw = readRings();
if (!raw.length) throw new Error('No polygon records found in the shapefile.');

const round = (v) => Math.round(v * 10 ** PRECISION) / 10 ** PRECISION;

let before = 0;
let after = 0;
// Flat [lon, lat, lon, lat, ...] per ring -- half the JSON of nested pairs.
const rings = raw
  .map((ring) => {
    before += ring.length;
    const thin = simplify(ring, TOLERANCE);
    after += thin.length;
    return thin.flatMap(([lon, lat]) => [round(lon), round(lat)]);
  })
  // A ring needs 3 corners to enclose anything.
  .filter((flat) => flat.length >= 6);

const lons = rings.flatMap((r) => r.filter((_, i) => i % 2 === 0));
const lats = rings.flatMap((r) => r.filter((_, i) => i % 2 === 1));
const bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];

mkdirSync(OUT_DIR, { recursive: true });
const out = { bbox, rings };
writeFileSync(resolve(OUT_DIR, 'districts.json'), JSON.stringify(out));

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`✓ ${rings.length} district rings -> src/data/districts.json`);
console.log(`  vertices ${before} -> ${after} (${((1 - after / before) * 100).toFixed(0)}% dropped)`);
console.log(`  payload ${kb(JSON.stringify(out).length)}`);
console.log(`  bbox lon ${bbox[0]}..${bbox[2]}  lat ${bbox[1]}..${bbox[3]}`);
