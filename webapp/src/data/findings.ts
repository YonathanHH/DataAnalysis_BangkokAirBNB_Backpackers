/**
 * Statistics as printed by EDA_AirBNB.ipynb against the full cleaned frame.
 *
 * These are the *published* numbers. The dashboard recomputes the same tests
 * live against whatever slice the reader filters to; with filters cleared the
 * two agree, which is what makes the live figures trustworthy.
 */

export interface PublishedTest {
  id: string;
  test: string;
  question: string;
  stat: number;
  statLabel: string;
  p: number;
  /** Notebook's stated conclusion, kept verbatim in substance. */
  verdict: string;
  rejectsNull: boolean;
}

export const PUBLISHED_TESTS: PublishedTest[] = [
  {
    id: 'shapiro-price',
    test: 'Shapiro-Wilk',
    question: 'Is nightly price normally distributed?',
    stat: 0.974,
    statLabel: 'W',
    p: 0.0,
    verdict:
      'Price is not normal, so every correlation below uses Spearman rank rather than Pearson.',
    rejectsNull: true,
  },
  {
    id: 'spearman-rpm-price',
    test: 'Spearman',
    question: 'Does price move with reviews per month?',
    stat: 0.164,
    statLabel: 'rho',
    p: 0.0,
    verdict:
      'Weak but significant positive link — dearer budget listings turn over slightly faster, not slower.',
    rejectsNull: true,
  },
  {
    id: 'spearman-reviews-price',
    test: 'Spearman',
    question: 'Does price move with total reviews?',
    stat: 0.071,
    statLabel: 'rho',
    p: 0.0,
    verdict: 'Significant but very weak; lifetime review count is a poor demand proxy.',
    rejectsNull: true,
  },
  {
    id: 'spearman-ltm-price',
    test: 'Spearman',
    question: 'Does price move with reviews in the last 12 months?',
    stat: 0.161,
    statLabel: 'rho',
    p: 0.0,
    verdict: 'Matches the reviews-per-month result, confirming the choice of metric.',
    rejectsNull: true,
  },
  {
    id: 'anova-price-segment',
    test: 'One-way ANOVA',
    question: 'Do the three price segments differ in reviews per month?',
    stat: 62.899,
    statLabel: 'F',
    p: 8.704e-28,
    verdict:
      'Segments differ strongly. Upper-end Budget books fastest; Low-end Budget slowest.',
    rejectsNull: true,
  },
  {
    id: 'spearman-listings-price',
    test: 'Spearman',
    question: 'Do denser neighbourhoods charge more?',
    stat: 0.486,
    statLabel: 'rho',
    p: 0.0004,
    verdict:
      'Moderate positive link across the 49 districts — supply and price rise together.',
    rejectsNull: true,
  },
  {
    id: 'anova-neighbourhood',
    test: 'One-way ANOVA',
    question: 'Do the top 10 neighbourhoods differ in reviews per month?',
    stat: 2.494,
    statLabel: 'F',
    p: 0.0077,
    verdict: 'Location genuinely shifts booking velocity, though the effect is modest.',
    rejectsNull: true,
  },
  {
    id: 'chi2-host-type',
    test: 'Chi-square',
    question: 'Is host type associated with being a high-review listing?',
    stat: 159.007,
    statLabel: 'chi2',
    p: 0.0,
    verdict:
      'Strong association — multi-listing hosts are over-represented among high-review listings.',
    rejectsNull: true,
  },
  {
    id: 'spearman-minnights',
    test: 'Spearman',
    question: 'Does a longer minimum stay cost you reviews?',
    stat: -0.081,
    statLabel: 'rho',
    p: 0.0,
    verdict: 'Negative and significant — every extra required night suppresses turnover.',
    rejectsNull: true,
  },
  {
    id: 'spearman-availability',
    test: 'Spearman',
    question: 'Do highly available listings get fewer recent reviews?',
    stat: -0.197,
    statLabel: 'rho',
    p: 0.0,
    verdict:
      'The clearest negative signal in the study: an open calendar reads as unsold inventory.',
    rejectsNull: true,
  },
];

/** Conclusions carried over from the notebook's section VI. */
export const CONCLUSIONS: { headline: string; detail: string }[] = [
  {
    headline: 'The market is segmented, not monolithic',
    detail:
      'Entire homes and shared rooms behave like different businesses on both price and performance. A single pricing rule across room types is wrong by construction.',
  },
  {
    headline: 'Location matters most at the budget end',
    detail:
      'Central Bangkok absorbs everything from ฿300 dorm beds to ฿1,999 apartments. Density and price rise together (rho = 0.49), so competing on the fringe means competing on price alone.',
  },
  {
    headline: 'Professional scale dominates the high-review tier',
    detail:
      'Multi-listing hosts hold 72% of the inventory and are over-represented among fast-booking listings, but single operators still hold defensible niches.',
  },
  {
    headline: 'Shared rooms are the untapped opportunity',
    detail:
      'Only 196 of 6,619 budget listings are shared rooms — the format backpackers actually search for. The notebook also read a price inversion here; re-tested with a significance test rather than a regression line, that inversion does not hold (rho = -0.09, p = 0.21). The thin supply is the real opportunity, not the pricing.',
  },
  {
    headline: 'Flexibility drives velocity',
    detail:
      'Minimum-night requirements correlate negatively with reviews. One-night minimums are close to a prerequisite for high turnover.',
  },
];

export const RECOMMENDATIONS: { title: string; body: string }[] = [
  {
    title: 'Drop the minimum stay to one night',
    body: 'Minimum nights correlate negatively with booking velocity across every room type. This is the cheapest lever on the board — it costs nothing but a settings change.',
  },
  {
    title: 'Treat high availability as a warning light',
    body: 'Availability shows the strongest negative correlation with recent reviews (rho = -0.20). A calendar that is open 300+ days is reporting unsold inventory, not readiness. Audit price, photos and response time before adding more open dates.',
  },
  {
    title: 'Enter shared rooms where competitors will not',
    body: 'Shared rooms are 3% of budget supply yet carry the backpacker use case — the thinnest competition in the dataset. Do not assume you must undercut to win there: the apparent price inversion in shared rooms is not statistically significant at n = 196.',
  },
  {
    title: 'Anchor in the central business district',
    body: 'Khlong Toei, Vadhana, Sathon, Phra Nakhon and Phaya Thai recur at the top of both the supply and the demand rankings. Proximity to the CBD is what makes a budget listing competitive.',
  },
  {
    title: 'Do not race to the bottom on price',
    body: 'For entire homes, higher budget prices attract more reviews, not fewer (rho = 0.20) — the upper-budget band reaches beyond backpackers into value-seeking travellers. Private rooms run the other way, but so weakly (rho = -0.06) that price is not the lever there either.',
  },
];
