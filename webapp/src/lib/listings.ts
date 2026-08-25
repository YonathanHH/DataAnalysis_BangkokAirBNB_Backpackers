import raw from '../data/listings.json';
import pipeline from '../data/pipeline.json';

/**
 * The cleaned frame from EDA_AirBNB.ipynb, 6,619 budget listings.
 * Shipped as tuples to keep the payload small; decoded once at module load.
 */

/** Tuple field order — must mirror the emit block in scripts/build-data.mjs. */
const enum F {
  Id,
  Hood,
  Room,
  Lat,
  Lon,
  Price,
  MinNights,
  Reviews,
  ReviewsLtm,
  ReviewsPerMonth,
  Availability,
  MultiHost,
  LastReview,
}

export type RoomType = 'Entire home/apt' | 'Private room' | 'Hotel room' | 'Shared room';
export type HostType = 'Multi-listing' | 'Single-listing';
export type PriceSegment = 'Low-end Budget' | 'Mid-range Budget' | 'Upper-end Budget';
export type ReviewSegment = 'High review' | 'Low review';

export interface Listing {
  id: string;
  neighbourhood: string;
  roomType: RoomType;
  lat: number;
  lon: number;
  price: number;
  minNights: number;
  reviews: number;
  reviewsLtm: number;
  reviewsPerMonth: number;
  availability: number;
  hostType: HostType;
  priceSegment: PriceSegment;
  reviewSegment: ReviewSegment;
  lastReview: string;
}

export const ROOM_TYPES: readonly RoomType[] = [
  'Entire home/apt',
  'Private room',
  'Hotel room',
  'Shared room',
];

export const HOST_TYPES: readonly HostType[] = ['Multi-listing', 'Single-listing'];

/** Ordered cheap -> dear; the ordinal ramp depends on this order. */
export const PRICE_SEGMENTS: readonly PriceSegment[] = [
  'Low-end Budget',
  'Mid-range Budget',
  'Upper-end Budget',
];

export const REVIEW_SEGMENTS: readonly ReviewSegment[] = ['High review', 'Low review'];

/** Cut points from the notebook's segment_price(): <500 / <1000 / rest (THB). */
export const segmentPrice = (price: number): PriceSegment =>
  price < 500 ? 'Low-end Budget' : price < 1000 ? 'Mid-range Budget' : 'Upper-end Budget';

/** Median reviews_per_month across the cleaned frame — the high/low review split. */
export const RPM_MEDIAN: number = pipeline.rpmMedian;

export const CLEANING_FUNNEL: { step: string; rows: number }[] = pipeline.funnel;

const source = raw as {
  roomTypes: string[];
  neighbourhoods: string[];
  rows: (number | string)[][];
};

export const NEIGHBOURHOODS: readonly string[] = source.neighbourhoods;

export const LISTINGS: readonly Listing[] = source.rows.map((r) => {
  const rpm = r[F.ReviewsPerMonth] as number;
  const price = r[F.Price] as number;
  return {
    id: String(r[F.Id]),
    neighbourhood: source.neighbourhoods[r[F.Hood] as number],
    roomType: source.roomTypes[r[F.Room] as number] as RoomType,
    lat: r[F.Lat] as number,
    lon: r[F.Lon] as number,
    price,
    minNights: r[F.MinNights] as number,
    reviews: r[F.Reviews] as number,
    reviewsLtm: r[F.ReviewsLtm] as number,
    reviewsPerMonth: rpm,
    availability: r[F.Availability] as number,
    hostType: r[F.MultiHost] === 1 ? 'Multi-listing' : 'Single-listing',
    priceSegment: segmentPrice(price),
    // Strictly greater-than, matching the notebook's apply() on the median.
    reviewSegment: rpm > RPM_MEDIAN ? 'High review' : 'Low review',
    lastReview: String(r[F.LastReview]),
  };
});

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export interface Filters {
  roomType: RoomType | 'All';
  priceSegment: PriceSegment | 'All';
  hostType: HostType | 'All';
  neighbourhood: string | 'All';
}

export const DEFAULT_FILTERS: Filters = {
  roomType: 'All',
  priceSegment: 'All',
  hostType: 'All',
  neighbourhood: 'All',
};

export const isDefaultFilters = (f: Filters): boolean =>
  f.roomType === 'All' &&
  f.priceSegment === 'All' &&
  f.hostType === 'All' &&
  f.neighbourhood === 'All';

export function applyFilters(rows: readonly Listing[], f: Filters): Listing[] {
  if (isDefaultFilters(f)) return rows as Listing[];
  return rows.filter(
    (d) =>
      (f.roomType === 'All' || d.roomType === f.roomType) &&
      (f.priceSegment === 'All' || d.priceSegment === f.priceSegment) &&
      (f.hostType === 'All' || d.hostType === f.hostType) &&
      (f.neighbourhood === 'All' || d.neighbourhood === f.neighbourhood),
  );
}

/** Human-readable summary of the active slice, for chart subtitles. */
export function describeFilters(f: Filters): string {
  const parts: string[] = [];
  if (f.roomType !== 'All') parts.push(f.roomType);
  if (f.priceSegment !== 'All') parts.push(f.priceSegment);
  if (f.hostType !== 'All') parts.push(f.hostType);
  if (f.neighbourhood !== 'All') parts.push(f.neighbourhood);
  return parts.length ? parts.join(' · ') : 'All budget listings';
}
