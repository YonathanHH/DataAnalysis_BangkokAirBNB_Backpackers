import { useMemo } from 'react';
import { BarChart } from '../charts/BarChart';
import { Heatmap } from '../charts/Heatmap';
import { StackedBar } from '../charts/StackedBar';
import { SERIES } from '../charts/shared';
import {
  Card,
  DataTable,
  EmptyState,
  Finding,
  SwatchLabel,
  useView,
} from '../components/ui';
import { dec, int, pValue, pct } from '../lib/format';
import {
  HOST_TYPES,
  RPM_MEDIAN,
  ROOM_TYPES,
  type Listing,
  type RoomType,
} from '../lib/listings';
import { chiSquare, groupBy, mean, spearman } from '../lib/stats';

/** Ordered bands. Bar length carries the value; one colour keeps it honest. */
const NIGHT_BANDS = [
  { label: '1 night', test: (n: number) => n === 1 },
  { label: '2–3 nights', test: (n: number) => n >= 2 && n <= 3 },
  { label: '4–7 nights', test: (n: number) => n >= 4 && n <= 7 },
  { label: '8–30 nights', test: (n: number) => n >= 8 && n <= 30 },
  { label: 'Over 30 nights', test: (n: number) => n > 30 },
];

const AVAILABILITY_BANDS = [
  { label: '1–90 days', test: (n: number) => n <= 90 },
  { label: '91–180 days', test: (n: number) => n > 90 && n <= 180 },
  { label: '181–270 days', test: (n: number) => n > 180 && n <= 270 },
  { label: '271–365 days', test: (n: number) => n > 270 },
];

export function Competition({ rows, slice }: { rows: Listing[]; slice: string }) {
  const [hostView, hostToggle] = useView();
  const [roomView, roomToggle] = useView();
  const [nightView, nightToggle] = useView();

  /**
   * The notebook's contingency table, reproduced exactly. Note it brackets the
   * median from both sides (`> median` and `< median`), so listings sitting
   * precisely on it fall into neither group and are excluded from this test —
   * unlike the `reviews_segment` column used by the charts, which assigns ties
   * to the low group. Keeping both conventions is what makes the live figure
   * reproduce the published one.
   */
  const hostTable = useMemo(() => {
    const cell = (host: string, high: boolean) =>
      rows.filter(
        (d) =>
          d.hostType === host &&
          (high ? d.reviewsPerMonth > RPM_MEDIAN : d.reviewsPerMonth < RPM_MEDIAN),
      ).length;
    return {
      highSingle: cell('Single-listing', true),
      highMulti: cell('Multi-listing', true),
      lowSingle: cell('Single-listing', false),
      lowMulti: cell('Multi-listing', false),
      ties: rows.filter((d) => d.reviewsPerMonth === RPM_MEDIAN).length,
    };
  }, [rows]);

  const hostChi = useMemo(
    () =>
      chiSquare([
        [hostTable.highSingle, hostTable.highMulti],
        [hostTable.lowSingle, hostTable.lowMulti],
      ]),
    [hostTable],
  );

  const byHost = useMemo(() => {
    const g = groupBy(rows, (d) => d.hostType);
    return HOST_TYPES.map((h) => {
      const bucket = g.get(h) ?? [];
      return {
        hostType: h,
        n: bucket.length,
        avgRpm: bucket.length ? mean(bucket.map((d) => d.reviewsPerMonth)) : 0,
        highShare: bucket.length
          ? bucket.filter((d) => d.reviewSegment === 'High review').length / bucket.length
          : 0,
      };
    }).filter((d) => d.n > 0);
  }, [rows]);

  /** Grouped: room type x host type. Two series, so the legend is mandatory. */
  const roomByHost = useMemo(() => {
    const g = groupBy(rows, (d) => d.roomType);
    return ROOM_TYPES.map((rt) => {
      const bucket = g.get(rt) ?? [];
      return {
        roomType: rt,
        n: bucket.length,
        values: HOST_TYPES.map((h) => {
          const sub = bucket.filter((d) => d.hostType === h);
          return sub.length ? mean(sub.map((d) => d.reviewsPerMonth)) : 0;
        }),
        counts: HOST_TYPES.map((h) => bucket.filter((d) => d.hostType === h).length),
      };
    }).filter((d) => d.n > 0);
  }, [rows]);

  /** Share of each room type that clears the median review rate. */
  const roomReviewSplit = useMemo(() => {
    const g = groupBy(rows, (d) => d.roomType);
    return ROOM_TYPES.map((rt) => {
      const bucket = g.get(rt) ?? [];
      const high = bucket.filter((d) => d.reviewSegment === 'High review').length;
      return {
        roomType: rt,
        n: bucket.length,
        high,
        low: bucket.length - high,
        highShare: bucket.length ? high / bucket.length : 0,
      };
    }).filter((d) => d.n > 0);
  }, [rows]);

  const nightBands = useMemo(
    () =>
      NIGHT_BANDS.map((band) => {
        const bucket = rows.filter((d) => band.test(d.minNights));
        return {
          label: band.label,
          n: bucket.length,
          avgRpm: bucket.length ? mean(bucket.map((d) => d.reviewsPerMonth)) : 0,
        };
      }).filter((d) => d.n > 0),
    [rows],
  );

  const availabilityBands = useMemo(
    () =>
      AVAILABILITY_BANDS.map((band) => {
        const bucket = rows.filter((d) => band.test(d.availability));
        return {
          label: band.label,
          n: bucket.length,
          avgLtm: bucket.length ? mean(bucket.map((d) => d.reviewsLtm)) : 0,
        };
      }).filter((d) => d.n > 0),
    [rows],
  );

  const nightsRho = useMemo(
    () => spearman(rows.map((d) => d.minNights), rows.map((d) => d.reviewsPerMonth)),
    [rows],
  );

  const availRho = useMemo(
    () => spearman(rows.map((d) => d.availability), rows.map((d) => d.reviewsLtm)),
    [rows],
  );

  /** Both frictions against all three review metrics, in one matrix. */
  const frictionMatrix = useMemo(() => {
    const cols = [
      rows.map((d) => d.minNights),
      rows.map((d) => d.availability),
      rows.map((d) => d.reviews),
      rows.map((d) => d.reviewsPerMonth),
      rows.map((d) => d.reviewsLtm),
    ];
    return cols.map((a) => cols.map((b) => spearman(a, b).stat));
  }, [rows]);

  if (!rows.length) return <EmptyState />;

  const roomColor = (rt: RoomType) => SERIES[ROOM_TYPES.indexOf(rt)];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="section__head">
        <p className="section__kicker">Question 3</p>
        <h2>Market competition: what separates a fast listing from a stalled one</h2>
        <p>
          Listings are split at the median booking rate of{' '}
          <b>{dec(RPM_MEDIAN)} reviews per month</b> — above it is a "high review" listing,
          below it a "low review" one. Two host-controlled settings move that outcome more
          than price does: how many nights you require, and how much of the calendar sits
          unsold.
        </p>
      </div>

      <div className="grid">
        <Card
          title="Do multi-listing hosts win more often?"
          subtitle="Share of each host type clearing the median review rate."
          span={7}
          action={hostToggle}
          note={
            <>
              Chi-square with Yates' correction on the current slice:{' '}
              <b>χ² = {dec(hostChi.stat, 2)}</b>, {pValue(hostChi.p)}, df {hostChi.df}, n ={' '}
              {int(hostChi.n)}.{' '}
              {hostChi.p < 0.05
                ? 'Host type and review performance are associated — professional operators are over-represented among fast listings.'
                : 'No significant association on this slice.'}{' '}
              {hostTable.ties > 0 && (
                <>
                  {int(hostTable.ties)} listings sit exactly on the median and are excluded
                  from this test, following the notebook.{' '}
                </>
              )}
              Notebook, full frame: χ² = 159.01, p &lt; 0.0001.
            </>
          }
        >
          {hostView === 'chart' ? (
            <StackedBar
              data={byHost.map((d) => ({
                label: d.hostType,
                values: [d.highShare * d.n, (1 - d.highShare) * d.n],
              }))}
              series={[
                { label: 'High review', color: SERIES[0] },
                { label: 'Low review', color: SERIES[1] },
              ]}
              reference={{ value: 0.5, label: 'Median split' }}
            />
          ) : (
            <DataTable
              caption="Review performance by host type"
              rows={byHost}
              rowKey={(d) => d.hostType}
              columns={[
                { header: 'Host type', cell: (d) => d.hostType },
                { header: 'Listings', cell: (d) => int(d.n) },
                { header: 'High review', cell: (d) => pct(d.highShare, 1) },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
              ]}
            />
          )}
        </Card>

        <Card title="Verdict" subtitle={slice} span={5}>
          <div className="stack">
            <Finding tone={hostChi.p < 0.05 ? 'good' : 'neutral'}>
              Scale helps, but it is not decisive. The association is strong statistically
              while the gap in average booking rate stays{' '}
              <b>
                {dec(Math.abs((byHost[0]?.avgRpm ?? 0) - (byHost[1]?.avgRpm ?? 0)), 2)}
              </b>{' '}
              reviews per month — single operators are not locked out.
            </Finding>
            <Finding tone="critical">
              Availability is the strongest single warning sign in the dataset: Spearman{' '}
              <b>rho = {dec(availRho.stat, 3)}</b> against reviews in the last 12 months,{' '}
              {pValue(availRho.p)}.
            </Finding>
            <Finding tone="warning">
              Minimum nights work against you: <b>rho = {dec(nightsRho.stat, 3)}</b>,{' '}
              {pValue(nightsRho.p)}. Small, but free to fix.
            </Finding>
          </div>
        </Card>

        <Card
          title="Booking rate by room type and host type"
          subtitle="Average reviews per month."
          span={7}
          action={roomToggle}
          note={
            <>
              Hotel rooms are the outlier: a professionally run hotel room books far faster
              than anything else in the budget band, and multi-listing operators run almost
              all of them.
            </>
          }
        >
          {roomView === 'chart' ? (
            <BarChart
              data={roomByHost.map((d) => ({ label: d.roomType, values: d.values }))}
              series={[
                { label: 'Multi-listing', color: SERIES[0] },
                { label: 'Single-listing', color: SERIES[1] },
              ]}
              format={(v) => dec(v, 2)}
              axisTitle="Average reviews per month"
              maxLabelWidth={116}
            />
          ) : (
            <DataTable
              caption="Booking rate by room type and host type"
              rows={roomByHost}
              rowKey={(d) => d.roomType}
              columns={[
                {
                  header: 'Room type',
                  cell: (d) => (
                    <SwatchLabel color={roomColor(d.roomType)}>{d.roomType}</SwatchLabel>
                  ),
                },
                { header: 'Multi-listing avg', cell: (d) => dec(d.values[0]) },
                { header: 'Single-listing avg', cell: (d) => dec(d.values[1]) },
                { header: 'Multi count', cell: (d) => int(d.counts[0]) },
                { header: 'Single count', cell: (d) => int(d.counts[1]) },
              ]}
            />
          )}
        </Card>

        <Card
          title="Which formats clear the median?"
          subtitle="Share of listings above the median review rate, by room type."
          span={5}
          note={
            <>
              The notebook drew four separate pie charts here. One stacked bar makes the
              comparison the reader actually wants — which formats sit above the 50% line
              and which fall short.
            </>
          }
        >
          <StackedBar
            data={roomReviewSplit.map((d) => ({
              label: d.roomType,
              values: [d.high, d.low],
            }))}
            series={[
              { label: 'High review', color: SERIES[0] },
              { label: 'Low review', color: SERIES[1] },
            ]}
            reference={{ value: 0.5, label: '50%' }}
          />
        </Card>

        <Card
          title="The cost of a minimum stay"
          subtitle="Average reviews per month by required nights."
          span={6}
          action={nightToggle}
          note={
            <>
              One series, so no legend box — bar length is the whole story. Each step up in
              required nights shaves turnover, and the drop past a week is steep.
            </>
          }
        >
          {nightView === 'chart' ? (
            <BarChart
              data={nightBands.map((d) => ({ label: d.label, values: [d.avgRpm] }))}
              series={[{ label: 'Avg reviews / month', color: SERIES[0] }]}
              format={(v) => dec(v, 2)}
              axisTitle="Average reviews per month"
              maxLabelWidth={120}
            />
          ) : (
            <DataTable
              caption="Booking rate by minimum-nights band"
              rows={nightBands}
              rowKey={(d) => d.label}
              columns={[
                { header: 'Minimum stay', cell: (d) => d.label },
                { header: 'Listings', cell: (d) => int(d.n) },
                { header: 'Avg reviews/mo', cell: (d) => dec(d.avgRpm) },
              ]}
            />
          )}
        </Card>

        <Card
          title="The open-calendar problem"
          subtitle="Average reviews in the last 12 months by days available."
          span={6}
          note={
            <>
              Availability and recent reviews use the same 12-month window, so the
              comparison is like for like. Listings open almost the whole year collect the
              fewest bookings — an open calendar is a symptom, not a strategy.
            </>
          }
        >
          <BarChart
            data={availabilityBands.map((d) => ({ label: d.label, values: [d.avgLtm] }))}
            series={[{ label: 'Avg reviews (12 mo)', color: SERIES[0] }]}
            format={(v) => dec(v, 1)}
            axisTitle="Average reviews in the last 12 months"
            maxLabelWidth={120}
          />
        </Card>

        <Card
          title="Friction against demand"
          subtitle="Spearman correlations between host-controlled settings and every review metric."
          span={12}
          note={
            <>
              Both friction rows run negative against all three review metrics. The
              relationships are weak individually — nothing here explains the market on its
              own — but they point the same direction consistently, which is what makes
              them actionable.
            </>
          }
        >
          <Heatmap
            labels={['Min nights', 'Availability', 'Reviews', 'Per month', '12 months']}
            matrix={frictionMatrix}
          />
        </Card>
      </div>
    </div>
  );
}
