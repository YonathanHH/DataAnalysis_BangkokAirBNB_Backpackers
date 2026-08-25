import { useMemo } from 'react';
import { BarChart } from '../charts/BarChart';
import { MapCanvas, type MapPoint } from '../charts/MapCanvas';
import { Scatter } from '../charts/Scatter';
import { SERIES } from '../charts/shared';
import { Card, DataTable, EmptyState, Finding, useView } from '../components/ui';
import { dec, int, pValue, thb } from '../lib/format';
import type { Listing } from '../lib/listings';
import { anova, groupBy, linearFit, mean, spearman } from '../lib/stats';

interface District {
  name: string;
  count: number;
  avgPrice: number;
  avgRpm: number;
  lat: number;
  lon: number;
  sharedRooms: number;
}

export function Geography({ rows, slice }: { rows: Listing[]; slice: string }) {
  const [supplyView, supplyToggle] = useView();
  const [demandView, demandToggle] = useView();

  const districts = useMemo<District[]>(() => {
    const g = groupBy(rows, (d) => d.neighbourhood);
    return [...g.entries()]
      .map(([name, bucket]) => ({
        name,
        count: bucket.length,
        avgPrice: mean(bucket.map((d) => d.price)),
        avgRpm: mean(bucket.map((d) => d.reviewsPerMonth)),
        // Centroid of the district's own listings — no shapefile is readable here.
        lat: mean(bucket.map((d) => d.lat)),
        lon: mean(bucket.map((d) => d.lon)),
        sharedRooms: bucket.filter((d) => d.roomType === 'Shared room').length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  /** Supply density against price — the notebook's neighbourhood scatter. */
  const densityVsPrice = useMemo(
    () => spearman(districts.map((d) => d.count), districts.map((d) => d.avgPrice)),
    [districts],
  );

  const densityFit = useMemo(
    () => linearFit(districts.map((d) => d.count), districts.map((d) => d.avgPrice)),
    [districts],
  );

  const topByDemand = useMemo(
    () =>
      [...districts]
        // A district needs enough listings for its mean to mean anything.
        .filter((d) => d.count >= 10)
        .sort((a, b) => b.avgRpm - a.avgRpm)
        .slice(0, 10),
    [districts],
  );

  const topBySupply = useMemo(() => districts.slice(0, 10), [districts]);

  const demandAnova = useMemo(() => {
    const names = new Set(topByDemand.map((d) => d.name));
    const g = groupBy(
      rows.filter((d) => names.has(d.neighbourhood)),
      (d) => d.neighbourhood,
    );
    return anova([...g.values()].map((bucket) => bucket.map((d) => d.reviewsPerMonth)));
  }, [rows, topByDemand]);

  const rpmDomain = useMemo<[number, number]>(() => {
    if (!districts.length) return [0, 1];
    const values = districts.map((d) => d.avgRpm);
    return [Math.min(...values), Math.max(...values)];
  }, [districts]);

  const maxCount = Math.max(1, ...districts.map((d) => d.count));

  const mapPoints = useMemo<MapPoint[]>(
    () =>
      districts.map((d) => ({
        lat: d.lat,
        lon: d.lon,
        value: d.avgRpm,
        // Area, not radius, tracks the count — so a district twice as big looks twice as big.
        radius: 6 + Math.sqrt(d.count / maxCount) * 22,
        title: d.name,
        rows: [
          { label: 'Listings', value: int(d.count) },
          { label: 'Avg price', value: thb(d.avgPrice) },
          { label: 'Avg reviews/mo', value: dec(d.avgRpm) },
          { label: 'Shared rooms', value: int(d.sharedRooms) },
        ],
      })),
    [districts, maxCount],
  );

  /** Districts that top both the supply and the demand ranking. */
  const overlap = useMemo(() => {
    const demand = new Set(topByDemand.map((d) => d.name));
    return topBySupply.filter((d) => demand.has(d.name)).map((d) => d.name);
  }, [topBySupply, topByDemand]);

  if (!rows.length) return <EmptyState />;

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="section__head">
        <p className="section__kicker">Question 2</p>
        <h2>Geography: where budget listings compete, and where they book</h2>
        <p>
          Supply and price rise together across Bangkok's districts, so the cheap corners
          of the city are also the thin ones. The districts that appear near the top of{' '}
          <em>both</em> the supply and the demand rankings are where a budget listing has
          somewhere to stand.
        </p>
      </div>

      <div className="grid">
        <Card
          title="Districts by booking velocity"
          subtitle="Bubble area is listing count; colour is average reviews per month."
          span={12}
          note={
            <>
              Two encodings, two questions: size answers "how much competition is here",
              colour answers "how fast does it move". The bubbles sit at the centroid of
              each district's own listings, since the bundled shapefile is missing the
              sidecar files needed to read real boundaries.
            </>
          }
        >
          <MapCanvas
            points={mapPoints}
            domain={rpmDomain}
            scaleLabel="Average reviews per month"
            formatScale={(v) => dec(v, 2)}
            maxHeight={520}
            ringed
          />
        </Card>

        <Card
          title="Does density come with a price premium?"
          subtitle="One point per district: listing count against average nightly price."
          span={7}
          note={
            <>
              Spearman <b>rho = {dec(densityVsPrice.stat, 3)}</b>, {pValue(densityVsPrice.p)}{' '}
              over {int(densityVsPrice.n)} districts.{' '}
              {densityVsPrice.p < 0.05 && densityVsPrice.stat > 0
                ? 'Crowded districts charge more, not less — competition here is not a price war.'
                : 'No clear relationship on this slice.'}{' '}
              Notebook, full frame: rho = 0.486, p = 0.0004.
            </>
          }
        >
          <Scatter
            points={districts.map((d) => ({ x: d.count, y: d.avgPrice, label: d.name }))}
            xTitle="Listings in district"
            yTitle="Average price (THB)"
            formatX={int}
            formatY={thb}
            trend={densityFit}
            height={310}
            radius={5}
          />
        </Card>

        <Card title="Verdict" subtitle={slice} span={5}>
          <div className="stack">
            <Finding tone="good">
              Density and price move together. Central districts hold both the most supply
              and the highest budget prices — <b>they are not cheaper for being crowded</b>.
            </Finding>
            <Finding tone={demandAnova.p < 0.05 ? 'good' : 'neutral'}>
              Booking velocity differs across the top districts: ANOVA{' '}
              <b>F = {dec(demandAnova.stat, 2)}</b>, {pValue(demandAnova.p)}.{' '}
              {demandAnova.p < 0.05
                ? 'Location genuinely shifts turnover, though the effect is modest next to listing-level factors.'
                : 'Not significant on this slice.'}
            </Finding>
            {overlap.length > 0 && (
              <Finding tone="neutral">
                Top-10 on both supply and demand:{' '}
                <b>{overlap.join(', ')}</b>. These are the districts where demand has kept
                pace with the competition.
              </Finding>
            )}
            <p className="testline">Notebook, full frame: F = 2.494, p = 0.0077.</p>
          </div>
        </Card>

        <Card
          title="Most competitive districts"
          subtitle="Ranked by listing count — where you would be one of many."
          span={6}
          action={supplyToggle}
        >
          {supplyView === 'chart' ? (
            <BarChart
              data={topBySupply.map((d) => ({ label: d.name, values: [d.count] }))}
              series={[{ label: 'Listings', color: SERIES[0] }]}
              format={int}
              axisTitle="Listings"
            />
          ) : (
            <DataTable
              caption="Districts by listing count"
              rows={topBySupply}
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
          title="Fastest-booking districts"
          subtitle="Ranked by average reviews per month, minimum 10 listings."
          span={6}
          action={demandToggle}
          note={
            <>
              The 10-listing floor matters: without it, a single district with three
              listings and one busy host tops the chart on noise alone.
            </>
          }
        >
          {demandView === 'chart' ? (
            <BarChart
              data={topByDemand.map((d) => ({ label: d.name, values: [d.avgRpm] }))}
              series={[{ label: 'Avg reviews / month', color: SERIES[2] }]}
              format={(v) => dec(v, 2)}
              axisTitle="Average reviews per month"
            />
          ) : (
            <DataTable
              caption="Districts by booking velocity"
              rows={topByDemand}
              rowKey={(d) => d.name}
              columns={[
                { header: 'District', cell: (d) => d.name },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
                { header: 'Listings', cell: (d) => int(d.count) },
                { header: 'Avg price', cell: (d) => thb(d.avgPrice) },
              ]}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
