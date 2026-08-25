import { useMemo } from 'react';
import { BarChart } from '../charts/BarChart';
import { MapCanvas, type MapPoint } from '../charts/MapCanvas';
import { ORDINAL, SERIES } from '../charts/shared';
import {
  Card,
  DataTable,
  EmptyState,
  Hero,
  StatTile,
  SwatchLabel,
  useView,
} from '../components/ui';
import { CONCLUSIONS } from '../data/findings';
import { dec, int, pct, thb } from '../lib/format';
import {
  PRICE_SEGMENTS,
  ROOM_TYPES,
  type Listing,
  type PriceSegment,
  type RoomType,
} from '../lib/listings';
import { groupBy, mean, median } from '../lib/stats';

export function Overview({ rows, slice }: { rows: Listing[]; slice: string }) {
  const [roomView, roomToggle] = useView();
  const [hoodView, hoodToggle] = useView();

  const summary = useMemo(() => {
    if (!rows.length) return null;
    const prices = rows.map((d) => d.price);
    const shared = rows.filter((d) => d.roomType === 'Shared room').length;
    const flexible = rows.filter((d) => d.minNights === 1).length;
    const wideOpen = rows.filter((d) => d.availability > 300).length;
    return {
      n: rows.length,
      medianPrice: median(prices),
      medianRpm: median(rows.map((d) => d.reviewsPerMonth)),
      sharedShare: shared / rows.length,
      flexShare: flexible / rows.length,
      openShare: wideOpen / rows.length,
      neighbourhoods: new Set(rows.map((d) => d.neighbourhood)).size,
    };
  }, [rows]);

  const byRoom = useMemo(() => {
    const g = groupBy(rows, (d) => d.roomType);
    return ROOM_TYPES.map((rt) => {
      const bucket = g.get(rt) ?? [];
      return {
        roomType: rt,
        count: bucket.length,
        share: rows.length ? bucket.length / rows.length : 0,
        medianPrice: bucket.length ? median(bucket.map((d) => d.price)) : 0,
        avgRpm: bucket.length ? mean(bucket.map((d) => d.reviewsPerMonth)) : 0,
      };
    }).filter((d) => d.count > 0);
  }, [rows]);

  const bySegment = useMemo(() => {
    const g = groupBy(rows, (d) => d.priceSegment);
    return PRICE_SEGMENTS.map((seg) => ({
      segment: seg,
      count: g.get(seg)?.length ?? 0,
    })).filter((d) => d.count > 0);
  }, [rows]);

  const topHoods = useMemo(() => {
    const g = groupBy(rows, (d) => d.neighbourhood);
    return [...g.entries()]
      .map(([name, bucket]) => ({
        name,
        count: bucket.length,
        avgPrice: mean(bucket.map((d) => d.price)),
        avgRpm: mean(bucket.map((d) => d.reviewsPerMonth)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  const mapPoints = useMemo<MapPoint[]>(
    () =>
      rows.map((d) => ({
        lat: d.lat,
        lon: d.lon,
        value: d.price,
        title: d.neighbourhood,
        radius: 2,
        rows: [
          { label: 'Room type', value: d.roomType },
          { label: 'Price', value: thb(d.price) },
          { label: 'Reviews / month', value: dec(d.reviewsPerMonth) },
          { label: 'Minimum nights', value: int(d.minNights) },
        ],
      })),
    [rows],
  );

  if (!summary) return <EmptyState />;

  const roomColor = (rt: RoomType) => SERIES[ROOM_TYPES.indexOf(rt)];
  const segColor = (s: PriceSegment) => ORDINAL[PRICE_SEGMENTS.indexOf(s)];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="section__head">
        <p className="section__kicker">Overview</p>
        <h2>What the budget half of Bangkok's Airbnb market looks like</h2>
        <p>
          Every figure on this site is computed live from the cleaned frame in{' '}
          <code>EDA_AirBNB.ipynb</code> — 6,619 listings priced under ฿2,000 a night, each
          with at least one review and a bookable calendar. Change the filters above and
          every chart, table and significance test re-runs against that slice.
        </p>
      </div>

      <Hero figure={int(summary.n)} label={`Budget listings · ${slice}`}>
        Median nightly price {thb(summary.medianPrice)} across {summary.neighbourhoods}{' '}
        districts. Half these listings sit open more than 300 days a year — the single
        strongest warning sign in the whole dataset.
      </Hero>

      <div className="tiles">
        <StatTile
          label="Median nightly price"
          value={thb(summary.medianPrice)}
          hint="Capped at ฿2,000 — the backpacker ceiling"
        />
        <StatTile
          label="Median reviews per month"
          value={dec(summary.medianRpm)}
          hint="The booking-velocity proxy used throughout"
        />
        <StatTile
          label="Shared rooms"
          value={pct(summary.sharedShare, 1)}
          hint="The format backpackers search for"
        />
        <StatTile
          label="One-night minimum"
          value={pct(summary.flexShare, 0)}
          hint="Flexible listings turn over fastest"
        />
        <StatTile
          label="Open 300+ days"
          value={pct(summary.openShare, 0)}
          hint="Unsold inventory, not readiness"
        />
      </div>

      <div className="grid">
        <Card
          title="Supply by room type"
          subtitle="Entire homes dominate a segment that backpackers do not shop in."
          span={6}
          action={roomToggle}
          note={
            <>
              Shared rooms are <b>{pct(summary.sharedShare, 1)}</b> of budget supply. The
              notebook drew this as a pie; bars are used here because the comparison the
              reader needs is between categories, not against the whole.
            </>
          }
        >
          {roomView === 'chart' ? (
            <BarChart
              data={byRoom.map((d) => ({ label: d.roomType, values: [d.count] }))}
              series={[{ label: 'Listings', color: SERIES[0] }]}
              format={int}
              axisTitle="Listings"
              maxLabelWidth={116}
            />
          ) : (
            <DataTable
              caption="Listings by room type"
              rows={byRoom}
              rowKey={(d) => d.roomType}
              columns={[
                {
                  header: 'Room type',
                  cell: (d) => (
                    <SwatchLabel color={roomColor(d.roomType)}>{d.roomType}</SwatchLabel>
                  ),
                },
                { header: 'Listings', cell: (d) => int(d.count) },
                { header: 'Share', cell: (d) => pct(d.share, 1) },
                { header: 'Median price', cell: (d) => thb(d.medianPrice) },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
              ]}
            />
          )}
        </Card>

        <Card
          title="Where the supply sits"
          subtitle="Top 10 districts by listing count."
          span={6}
          action={hoodToggle}
          note={
            <>
              Supply concentrates in the central business district. Density and price rise
              together (<b>rho = 0.49</b>), so a fringe listing competes on price alone.
            </>
          }
        >
          {hoodView === 'chart' ? (
            <BarChart
              data={topHoods.map((d) => ({ label: d.name, values: [d.count] }))}
              series={[{ label: 'Listings', color: SERIES[0] }]}
              format={int}
              axisTitle="Listings"
            />
          ) : (
            <DataTable
              caption="Top districts by listing count"
              rows={topHoods}
              rowKey={(d) => d.name}
              columns={[
                { header: 'District', cell: (d) => d.name },
                { header: 'Listings', cell: (d) => int(d.count) },
                { header: 'Avg price', cell: (d) => thb(d.avgPrice) },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
              ]}
            />
          )}
        </Card>

        <Card
          title="Every budget listing, placed"
          subtitle="Coloured by nightly price. Darker means dearer."
          span={12}
          note={
            <>
              The repository's shapefile ships without its <code>.dbf</code> and{' '}
              <code>.shx</code> sidecars, so district outlines cannot be read from it. This
              map is built from listing coordinates alone — the shape of the city emerges
              from where hosts actually are.
            </>
          }
        >
          <MapCanvas
            points={mapPoints}
            domain={[295, 1999]}
            scaleLabel="Nightly price"
            formatScale={thb}
            maxHeight={520}
          />
        </Card>

        <Card
          title="Price segments"
          subtitle="Cut at ฿500 and ฿1,000, following the notebook's segment_price()."
          span={5}
          note={
            <>
              An ordered ramp rather than four separate hues — these categories have a
              natural sequence, and the colour should say so.
            </>
          }
        >
          <BarChart
            data={bySegment.map((d) => ({ label: d.segment, values: [d.count] }))}
            series={[{ label: 'Listings', color: SERIES[0] }]}
            ordinalColors={bySegment.map((d) => segColor(d.segment))}
            format={int}
            axisTitle="Listings"
            maxLabelWidth={126}
          />
        </Card>

        <Card
          title="What the analysis concluded"
          subtitle="Carried over from section VI of the notebook."
          span={7}
        >
          <ol className="stack" style={{ gap: 12, paddingLeft: 20, margin: 0 }}>
            {CONCLUSIONS.map((c) => (
              <li key={c.headline}>
                <b>{c.headline}.</b>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{c.detail}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
