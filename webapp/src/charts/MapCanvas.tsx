import { useEffect, useMemo, useRef, useState } from 'react';
import { useTooltip } from '../components/ui';
import { SEQUENTIAL, resolveVar, useMeasure, useThemeVersion } from './shared';

export interface MapPoint {
  lat: number;
  lon: number;
  /** Drives the sequential colour; already normalised by the caller. */
  value: number;
  title: string;
  rows: { label: string; value: string }[];
  /** Radius in CSS pixels. Districts scale by listing count; listings are flat. */
  radius?: number;
}

interface Props {
  points: MapPoint[];
  /** Domain of `value`, so the ramp stays stable as filters change. */
  domain: [number, number];
  scaleLabel: string;
  formatScale: (v: number) => string;
  /** Ceiling only — the drawn height follows the data's own aspect ratio. */
  maxHeight?: number;
  /** Draw a surface ring around each mark — right for sparse district bubbles. */
  ringed?: boolean;
}

/** Bangkok sits near 13.7°N, so longitude degrees are ~0.97 of a latitude degree. */
const LON_SCALE = Math.cos((13.75 * Math.PI) / 180);

/**
 * Listings placed by their WGS84 coordinates. The shapefile that ships with the
 * repo has no .dbf or .shx sidecar, so district outlines cannot be read from
 * it; the geography here comes entirely from the listing coordinates.
 */
export function MapCanvas({
  points,
  domain,
  scaleLabel,
  formatScale,
  maxHeight = 460,
  ringed = false,
}: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeVersion = useThemeVersion();
  const { setTip, hide, node } = useTooltip();
  const [ramp, setRamp] = useState<string[]>([]);

  useEffect(() => {
    setRamp(SEQUENTIAL.map((token) => resolveVar(token)));
  }, [themeVersion]);

  /** Bounding box of the cloud, aspect-corrected for latitude. */
  const bounds = useMemo(() => {
    if (!points.length) return null;
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      minLat,
      maxLat,
      minLon,
      spanX: (maxLon - minLon) * LON_SCALE || 1,
      spanY: maxLat - minLat || 1,
    };
  }, [points]);

  const PAD = 18;

  /**
   * Height follows the data's own aspect ratio rather than a fixed number, so
   * the city fills the card's width instead of floating in side gutters.
   */
  const height = useMemo(() => {
    if (!bounds || width <= 0) return Math.min(maxHeight, 360);
    const fitted = (width - PAD * 2) * (bounds.spanY / bounds.spanX) + PAD * 2;
    return Math.round(Math.max(300, Math.min(maxHeight, fitted)));
  }, [bounds, width, maxHeight]);

  /** Equirectangular fit of the point cloud into the sized canvas. */
  const project = useMemo(() => {
    if (!bounds || width <= 0) return null;
    const usableW = width - PAD * 2;
    const usableH = height - PAD * 2;
    const scale = Math.min(usableW / bounds.spanX, usableH / bounds.spanY);
    const offsetX = PAD + (usableW - bounds.spanX * scale) / 2;
    const offsetY = PAD + (usableH - bounds.spanY * scale) / 2;

    return {
      x: (lon: number) => offsetX + (lon - bounds.minLon) * LON_SCALE * scale,
      // Latitude grows north, canvas y grows south.
      y: (lat: number) => offsetY + (bounds.maxLat - lat) * scale,
    };
  }, [bounds, width, height]);

  /** Five-stop sequential ramp, interpolated in sRGB between adjacent stops. */
  const colorFor = useMemo(() => {
    const parse = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '').trim();
      const full =
        h.length === 3
          ? h
              .split('')
              .map((c) => c + c)
              .join('')
          : h;
      return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
      ];
    };
    if (ramp.length < 2) return () => '#3987e5';
    const stops = ramp.map(parse);
    const [lo, hi] = domain;
    const span = hi - lo || 1;
    return (value: number) => {
      const t = Math.max(0, Math.min(1, (value - lo) / span));
      const pos = t * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(pos));
      const f = pos - i;
      const [r0, g0, b0] = stops[i];
      const [r1, g1, b1] = stops[i + 1];
      return `rgb(${Math.round(r0 + (r1 - r0) * f)},${Math.round(g0 + (g1 - g0) * f)},${Math.round(
        b0 + (b1 - b0) * f,
      )})`;
    };
  }, [ramp, domain]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const surface = resolveVar('var(--surface)');
    // Largest marks first, so small dense ones stay visible on top.
    const ordered = [...points].sort((a, b) => (b.radius ?? 2) - (a.radius ?? 2));
    for (const p of ordered) {
      const r = p.radius ?? 2;
      ctx.beginPath();
      ctx.arc(project.x(p.lon), project.y(p.lat), r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(p.value);
      ctx.globalAlpha = ringed ? 0.92 : 0.65;
      ctx.fill();
      if (ringed) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = surface;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [points, project, width, height, colorFor, ringed, themeVersion]);

  return (
    <div className="map" ref={ref}>
      {width > 0 && (
        <canvas
          ref={canvasRef}
          style={{ width, height }}
          role="img"
          aria-label={`Map of Bangkok listings coloured by ${scaleLabel}`}
          onMouseMove={(e) => {
            if (!project) return;
            const box = ref.current!.getBoundingClientRect();
            const px = e.clientX - box.left;
            const py = e.clientY - box.top;
            let best: MapPoint | null = null;
            let bestDist = Infinity;
            for (const p of points) {
              const r = p.radius ?? 2;
              const dx = project.x(p.lon) - px;
              const dy = project.y(p.lat) - py;
              const d = dx * dx + dy * dy;
              // Generous target: the mark plus a ring, never smaller than 12px.
              const reach = Math.max(12, r + 6) ** 2;
              if (d < reach && d < bestDist) {
                bestDist = d;
                best = p;
              }
            }
            if (!best) return hide();
            setTip({
              x: project.x(best.lon),
              y: project.y(best.lat),
              title: best.title,
              rows: best.rows,
            });
          }}
          onMouseLeave={hide}
        />
      )}
      <div className="scale-legend">
        <span>{formatScale(domain[0])}</span>
        <span
          className="scale-legend__ramp"
          style={{
            background: `linear-gradient(to right, ${SEQUENTIAL.join(', ')})`,
          }}
          aria-hidden="true"
        />
        <span>{formatScale(domain[1])}</span>
        <span style={{ marginLeft: 4 }}>{scaleLabel}</span>
      </div>
      {node}
    </div>
  );
}
