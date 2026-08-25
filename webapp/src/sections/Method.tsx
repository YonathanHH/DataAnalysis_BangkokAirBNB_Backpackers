import { BarChart } from '../charts/BarChart';
import { FUNNEL } from '../charts/shared';
import { Card, DataTable, Finding } from '../components/ui';
import { PUBLISHED_TESTS, RECOMMENDATIONS } from '../data/findings';
import { dec, int, pValue } from '../lib/format';
import { CLEANING_FUNNEL, RPM_MEDIAN } from '../lib/listings';

const COLUMNS = [
  { field: 'id', description: 'Unique listing identifier', type: 'string' },
  { field: 'neighbourhood', description: 'District, geocoded from coordinates', type: 'string' },
  { field: 'latitude / longitude', description: 'WGS84 position', type: 'float' },
  { field: 'room_type', description: 'Entire home/apt · Private · Hotel · Shared', type: 'string' },
  { field: 'price', description: 'Nightly price in THB', type: 'int' },
  { field: 'minimum_nights', description: 'Required length of stay', type: 'int' },
  { field: 'number_of_reviews', description: 'Lifetime review count', type: 'int' },
  { field: 'number_of_reviews_ltm', description: 'Reviews in the last 12 months', type: 'int' },
  { field: 'reviews_per_month', description: 'Booking-velocity proxy used throughout', type: 'float' },
  { field: 'last_review', description: 'Date of the most recent review', type: 'date' },
  { field: 'availability_365', description: 'Days bookable in the next year', type: 'int' },
  { field: 'host_type', description: 'Derived: single- or multi-listing host', type: 'string' },
  { field: 'price_segment', description: 'Derived: budget band at ฿500 / ฿1,000', type: 'string' },
  { field: 'reviews_segment', description: 'Derived: above or below the median review rate', type: 'string' },
];

export function Method() {
  const kept = CLEANING_FUNNEL[CLEANING_FUNNEL.length - 1].rows;
  const started = CLEANING_FUNNEL[0].rows;

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="section__head">
        <p className="section__kicker">Method</p>
        <h2>How the frame was built, and what was tested on it</h2>
        <p>
          The dashboard does not read a pre-baked summary. It re-runs the notebook's
          cleaning pipeline at build time from the raw export and fails the build if any
          stage stops matching the row counts printed in the notebook.
        </p>
      </div>

      <div className="grid">
        <Card
          title="Cleaning funnel"
          subtitle={`${int(started)} raw rows reduced to ${int(kept)} analysable budget listings.`}
          span={7}
          note={
            <>
              Each stage is a deliberate exclusion, not a convenience: listings with no
              reviews carry no demand signal, listings over ฿2,000 are outside the budget
              band, and a listing with zero availability cannot be booked at all. The
              retained frame is <b>{dec((kept / started) * 100, 1)}%</b> of the export.
            </>
          }
        >
          <BarChart
            data={CLEANING_FUNNEL.map((f) => ({ label: f.step, values: [f.rows] }))}
            series={[{ label: 'Rows', color: 'var(--funnel-2)' }]}
            ordinalColors={FUNNEL}
            format={int}
            axisTitle="Rows remaining"
            maxLabelWidth={158}
          />
        </Card>

        <Card title="Decisions worth questioning" span={5}>
          <div className="stack">
            <Finding tone="warning">
              The ฿2,000 ceiling is a judgement call sourced from TripAdvisor's
              budget-traveller figure, not a break in the data. Listings just above it were
              dropped entirely rather than treated as a comparison group.
            </Finding>
            <Finding tone="warning">
              Dropping listings with no reviews removes roughly a third of the market. That
              is necessary — no reviews means no demand signal — but it means every figure
              here describes <b>listings that have already had at least one guest</b>.
            </Finding>
            <Finding tone="neutral">
              Reviews are a proxy for bookings, not a count of them. Roughly half of stays
              leave a review, and that rate varies by format, so cross-format comparisons
              carry more uncertainty than the p-values suggest.
            </Finding>
            <Finding tone="critical">
              One notebook claim does not survive re-testing. The shared-room price
              inversion was read off a regression line, never tested; the Spearman
              correlation behind it is <b>rho = −0.09, p = 0.21</b> at n = 196 — not
              significant. The Pricing tab states this in place of the original claim.
            </Finding>
            <Finding tone="neutral">
              The high/low review split uses the median of{' '}
              <b>{dec(RPM_MEDIAN)} reviews per month</b>, computed on the cleaned frame —
              so it is a within-market split, not an absolute standard.
            </Finding>
          </div>
        </Card>

        <Card
          title="Significance tests"
          subtitle="As printed by the notebook against the full cleaned frame."
          span={12}
          note={
            <>
              Every test on the other tabs is recomputed live in the browser against the
              filtered slice. With filters cleared those live figures reproduce this table,
              which is what makes the filtered ones trustworthy. Note that all ten reject
              their null — with n in the thousands, significance is cheap; effect size is
              what carries meaning, and most of these are small.
            </>
          }
        >
          <DataTable
            caption="Statistical tests from the notebook"
            rows={PUBLISHED_TESTS}
            rowKey={(t) => t.id}
            columns={[
              { header: 'Question', cell: (t) => t.question },
              { header: 'Test', align: 'left', cell: (t) => t.test },
              {
                header: 'Statistic',
                cell: (t) => `${t.statLabel} = ${dec(t.stat, 3)}`,
              },
              { header: 'p-value', cell: (t) => pValue(t.p) },
              {
                header: 'Reading',
                align: 'left',
                cell: (t) => (
                  <span style={{ whiteSpace: 'normal', display: 'block', maxWidth: 460 }}>
                    {t.verdict}
                  </span>
                ),
              },
            ]}
          />
        </Card>

        <Card
          title="Fields used"
          subtitle="Columns carried through from the raw export, plus three derived in cleaning."
          span={12}
        >
          <DataTable
            caption="Data dictionary"
            rows={COLUMNS}
            rowKey={(c) => c.field}
            columns={[
              { header: 'Field', cell: (c) => <code>{c.field}</code> },
              {
                header: 'Description',
                align: 'left',
                cell: (c) => (
                  <span style={{ whiteSpace: 'normal', display: 'block', maxWidth: 520 }}>
                    {c.description}
                  </span>
                ),
              },
              { header: 'Type', align: 'left', cell: (c) => c.type },
            ]}
          />
        </Card>

        <Card
          title="What a host should actually do"
          subtitle="Ordered by how much they move the outcome for how little they cost."
          span={12}
        >
          <ol className="recs">
            {RECOMMENDATIONS.map((r) => (
              <li className="rec" key={r.title}>
                <p className="rec__title">{r.title}</p>
                <p>{r.body}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
