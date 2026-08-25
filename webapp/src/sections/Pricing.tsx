import { useMemo } from 'react';
import { BarChart } from '../charts/BarChart';
import { BoxPlot } from '../charts/BoxPlot';
import { Heatmap } from '../charts/Heatmap';
import { Histogram } from '../charts/Histogram';
import { Scatter } from '../charts/Scatter';
import { ORDINAL, SERIES } from '../charts/shared';
import {
  Card,
  DataTable,
  EmptyState,
  Finding,
  SwatchLabel,
  useView,
} from '../components/ui';
import { dec, int, pValue, thb } from '../lib/format';
import {
  PRICE_SEGMENTS,
  ROOM_TYPES,
  type Listing,
  type PriceSegment,
  type RoomType,
} from '../lib/listings';
import { anova, fiveNumber, groupBy, histogram, linearFit, mean, spearman } from '../lib/stats';

/** Short labels: these double as heatmap column headers, where space is tight. */
const REVIEW_METRICS = [
  { key: 'price', label: 'Price' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'reviewsPerMonth', label: 'Per month' },
  { key: 'reviewsLtm', label: '12 months' },
] as const;

export function Pricing({ rows, slice }: { rows: Listing[]; slice: string }) {
  const [segView, segToggle] = useView();
  const [roomView, roomToggle] = useView();

  /** Spearman matrix over price and the three review metrics, recomputed live. */
  const matrix = useMemo(() => {
    const cols = REVIEW_METRICS.map((m) => rows.map((d) => d[m.key] as number));
    return cols.map((a) => cols.map((b) => spearman(a, b).stat));
  }, [rows]);

  const priceVsRpm = useMemo(
    () => spearman(rows.map((d) => d.price), rows.map((d) => d.reviewsPerMonth)),
    [rows],
  );

  const bySegment = useMemo(() => {
    const g = groupBy(rows, (d) => d.priceSegment);
    return PRICE_SEGMENTS.map((seg) => {
      const bucket = g.get(seg) ?? [];
      return {
        segment: seg,
        n: bucket.length,
        avgRpm: bucket.length ? mean(bucket.map((d) => d.reviewsPerMonth)) : 0,
        avgPrice: bucket.length ? mean(bucket.map((d) => d.price)) : 0,
        avgLtm: bucket.length ? mean(bucket.map((d) => d.reviewsLtm)) : 0,
      };
    }).filter((d) => d.n > 0);
  }, [rows]);

  const segmentAnova = useMemo(() => {
    const g = groupBy(rows, (d) => d.priceSegment);
    return anova(PRICE_SEGMENTS.map((s) => (g.get(s) ?? []).map((d) => d.reviewsPerMonth)));
  }, [rows]);

  const byRoom = useMemo(() => {
    const g = groupBy(rows, (d) => d.roomType);
    return ROOM_TYPES.map((rt) => {
      const bucket = g.get(rt) ?? [];
      const rho = bucket.length > 2
        ? spearman(bucket.map((d) => d.price), bucket.map((d) => d.reviewsPerMonth))
        : null;
      return {
        roomType: rt,
        n: bucket.length,
        box: bucket.length ? fiveNumber(bucket.map((d) => d.price)) : null,
        rho,
        avgRpm: bucket.length ? mean(bucket.map((d) => d.reviewsPerMonth)) : 0,
      };
    }).filter((d) => d.n > 0);
  }, [rows]);

  const scatterAll = useMemo(
    () => rows.map((d) => ({ x: d.reviewsPerMonth, y: d.price, label: d.neighbourhood })),
    [rows],
  );
  const scatterShared = useMemo(
    () =>
      rows
        .filter((d) => d.roomType === 'Shared room')
        .map((d) => ({ x: d.reviewsPerMonth, y: d.price, label: d.neighbourhood })),
    [rows],
  );

  const fitAll = useMemo(
    () => linearFit(scatterAll.map((p) => p.x), scatterAll.map((p) => p.y)),
    [scatterAll],
  );
  const fitShared = useMemo(
    () =>
      scatterShared.length > 2
        ? linearFit(scatterShared.map((p) => p.x), scatterShared.map((p) => p.y))
        : null,
    [scatterShared],
  );
  const sharedRho = useMemo(
    () =>
      scatterShared.length > 2
        ? spearman(scatterShared.map((p) => p.x), scatterShared.map((p) => p.y))
        : null,
    [scatterShared],
  );

  const priceBins = useMemo(() => histogram(rows.map((d) => d.price), 12), [rows]);

  if (!rows.length) return <EmptyState />;

  const segColor = (s: PriceSegment) => ORDINAL[PRICE_SEGMENTS.indexOf(s)];
  const roomColor = (rt: RoomType) => SERIES[ROOM_TYPES.indexOf(rt)];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="section__head">
        <p className="section__kicker">Question 1</p>
        <h2>Pricing strategy: does charging less actually win bookings?</h2>
        <p>
          The intuition for a backpacker segment is that cheaper wins. Across the budget
          market as a whole it does not — dearer listings book slightly faster. The
          notebook found the opposite inside shared rooms; re-tested here with a
          significance test rather than a regression line, that inversion turns out to be
          suggestive but unproven, while a small significant one shows up in private rooms
          instead.
        </p>
      </div>

      <div className="grid">
        <Card
          title="Price against the three review metrics"
          subtitle="Spearman rank correlation, recomputed on the current slice."
          span={7}
          note={
            <>
              Price is not normally distributed (Shapiro-Wilk W = 0.974), so rank
              correlation replaces Pearson throughout. Reviews per month carries the
              strongest signal, which is why the rest of the site uses it as the
              booking-velocity proxy.
            </>
          }
        >
          <Heatmap labels={REVIEW_METRICS.map((m) => m.label)} matrix={matrix} />
        </Card>

        <Card
          title="Verdict"
          subtitle={`Price vs reviews per month · ${slice}`}
          span={5}
        >
          <div className="stack">
            <Finding tone={priceVsRpm.p < 0.05 ? 'good' : 'neutral'}>
              Spearman <b>rho = {dec(priceVsRpm.stat, 3)}</b>, {pValue(priceVsRpm.p)} across{' '}
              {int(priceVsRpm.n)} listings.{' '}
              {priceVsRpm.p < 0.05
                ? priceVsRpm.stat > 0
                  ? 'Significant and positive — within the budget band, dearer listings book faster.'
                  : 'Significant and negative — here, cheaper listings book faster.'
                : 'Not significant on this slice; treat the relationship as absent.'}
            </Finding>
            <Finding tone="warning">
              A rho of this size explains only a few percent of the variance. Price is a
              real lever, but it is <b>not</b> the main one — minimum nights and
              availability both matter more.
            </Finding>
            <p className="testline">
              Notebook, full frame: rho = 0.164, p &lt; 0.0001.
            </p>
          </div>
        </Card>

        <Card
          title="All budget listings"
          subtitle="Nightly price against booking velocity."
          span={6}
          note={
            <>
              The cloud slopes gently upward. Read alongside the shared-room panel to its
              right — same axes, same scale, opposite slope.
            </>
          }
        >
          <Scatter
            points={scatterAll}
            xTitle="Reviews / month"
            yTitle="Price (THB)"
            formatX={(v) => dec(v, 1)}
            formatY={thb}
            trend={fitAll}
            height={290}
          />
        </Card>

        <Card
          title="Shared rooms only"
          subtitle="The backpacker format, plotted on the same axes."
          span={6}
          note={
            sharedRho ? (
              <>
                Spearman <b>rho = {dec(sharedRho.stat, 3)}</b>, {pValue(sharedRho.p)} over{' '}
                {int(sharedRho.n)} shared rooms.{' '}
                {sharedRho.p < 0.05 ? (
                  sharedRho.stat < 0 ? (
                    <>
                      The inversion is real and survives the test: here, undercutting does
                      buy volume.
                    </>
                  ) : (
                    <>On this slice the slope runs with the wider market, not against it.</>
                  )
                ) : (
                  <>
                    The fitted line does slope down, but at this sample size the
                    correlation is <b>not statistically significant</b>. The notebook read
                    the inversion off the regression line alone; tested directly, it does
                    not hold. Treat it as a lead, not a result.
                  </>
                )}
              </>
            ) : (
              <>Not enough shared rooms in this slice to fit a trend.</>
            )
          }
        >
          {scatterShared.length > 2 ? (
            <Scatter
              points={scatterShared}
              color={SERIES[3]}
              xTitle="Reviews / month"
              yTitle="Price (THB)"
              formatX={(v) => dec(v, 1)}
              formatY={thb}
              trend={fitShared}
              height={290}
              radius={3.2}
            />
          ) : (
            <p className="empty">No shared rooms in the current slice.</p>
          )}
        </Card>

        <Card
          title="Which price segment books fastest?"
          subtitle="Average reviews per month by budget band."
          span={7}
          action={segToggle}
          note={
            <>
              One-way ANOVA on the current slice: <b>F = {dec(segmentAnova.stat, 2)}</b>,{' '}
              {pValue(segmentAnova.p)} across {segmentAnova.k} segments.{' '}
              {segmentAnova.p < 0.05
                ? 'The segments differ significantly — the band you price into changes your turnover.'
                : 'No significant difference on this slice.'}{' '}
              Notebook, full frame: F = 62.90, p ≈ 8.7e-28.
            </>
          }
        >
          {segView === 'chart' ? (
            <BarChart
              data={bySegment.map((d) => ({ label: d.segment, values: [d.avgRpm] }))}
              series={[{ label: 'Avg reviews / month', color: SERIES[0] }]}
              ordinalColors={bySegment.map((d) => segColor(d.segment))}
              format={(v) => dec(v, 2)}
              axisTitle="Average reviews per month"
              maxLabelWidth={132}
            />
          ) : (
            <DataTable
              caption="Booking velocity by price segment"
              rows={bySegment}
              rowKey={(d) => d.segment}
              columns={[
                {
                  header: 'Segment',
                  cell: (d) => (
                    <SwatchLabel color={segColor(d.segment)}>{d.segment}</SwatchLabel>
                  ),
                },
                { header: 'Listings', cell: (d) => int(d.n) },
                { header: 'Avg price', cell: (d) => thb(d.avgPrice) },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
                { header: 'Avg reviews (12 mo)', cell: (d) => dec(d.avgLtm, 1) },
              ]}
            />
          )}
        </Card>

        <Card
          title="Where the prices sit"
          subtitle="Distribution across the ฿295–฿1,999 budget band."
          span={5}
          note={
            <>
              The pile-up at the top of the band is hosts pricing right at the ฿2,000
              ceiling — the boundary the notebook drew from TripAdvisor's budget-traveller
              figure, not a natural break in the market.
            </>
          }
        >
          <Histogram
            bins={priceBins}
            formatX={(v) => thb(Math.round(v))}
            axisTitle="Nightly price (THB)"
            height={252}
          />
        </Card>

        <Card
          title="Price spread by room type"
          subtitle="Box = middle 50% of listings, line = median, whiskers = observed range."
          span={12}
          action={roomToggle}
          note={
            <>
              Shared rooms sit in a different price world: a median around ฿434 against
              ฿1,200 for entire homes. Any single pricing rule applied across room types is
              wrong for at least one of them. Switch to the table to see where the
              price-to-velocity link actually clears significance — on the full frame it
              does so for entire homes (positive) and private rooms (negative), but not for
              hotel or shared rooms, where the samples are too small.
            </>
          }
        >
          {roomView === 'chart' ? (
            <BoxPlot
              data={byRoom
                .filter((d) => d.box)
                .map((d) => ({ ...d.box!, label: d.roomType, color: roomColor(d.roomType) }))}
              format={thb}
              axisTitle="Nightly price (THB)"
            />
          ) : (
            <DataTable
              caption="Price spread and price/velocity correlation by room type"
              rows={byRoom}
              rowKey={(d) => d.roomType}
              columns={[
                {
                  header: 'Room type',
                  cell: (d) => (
                    <SwatchLabel color={roomColor(d.roomType)}>{d.roomType}</SwatchLabel>
                  ),
                },
                { header: 'Listings', cell: (d) => int(d.n) },
                { header: 'Min', cell: (d) => (d.box ? thb(d.box.min) : '—') },
                { header: 'Median', cell: (d) => (d.box ? thb(d.box.median) : '—') },
                { header: 'Max', cell: (d) => (d.box ? thb(d.box.max) : '—') },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
                {
                  header: 'Price↔velocity rho',
                  cell: (d) => (d.rho ? dec(d.rho.stat, 3) : '—'),
                },
                {
                  header: 'Significant?',
                  cell: (d) =>
                    d.rho ? (d.rho.p < 0.05 ? `Yes (${pValue(d.rho.p)})` : `No (${pValue(d.rho.p)})`) : '—',
                },
              ]}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
