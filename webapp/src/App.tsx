import { useEffect, useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import {
  DEFAULT_FILTERS,
  LISTINGS,
  applyFilters,
  describeFilters,
  type Filters,
} from './lib/listings';
import { Competition } from './sections/Competition';
import { Geography } from './sections/Geography';
import { Method } from './sections/Method';
import { Overview } from './sections/Overview';
import { Pricing } from './sections/Pricing';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'geography', label: 'Geography' },
  { id: 'competition', label: 'Competition' },
  { id: 'method', label: 'Method' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const isTabId = (v: string): v is TabId => TABS.some((t) => t.id === v);

function ThemeToggle() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('bkk-theme');
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      // Private mode or blocked storage — fall back to the OS setting.
      return 'system';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') localStorage.removeItem('bkk-theme');
      else localStorage.setItem('bkk-theme', theme);
    } catch {
      // Nothing to persist to; the in-memory choice still applies this session.
    }
  }, [theme]);

  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const labels = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={`${labels[theme]}. Activate for ${next}.`}
    >
      {labels[theme]}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const hash = window.location.hash.slice(1);
    return isTabId(hash) ? hash : 'overview';
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      if (isTabId(hash)) setTab(hash);
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const rows = useMemo(() => applyFilters(LISTINGS, filters), [filters]);
  const slice = useMemo(() => describeFilters(filters), [filters]);

  const select = (id: TabId) => {
    setTab(id);
    // Replace rather than push, so Back leaves the site instead of walking tabs.
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="shell">
        <header className="masthead">
          <p className="masthead__eyebrow">Capstone · Bangkok Airbnb</p>
          <div className="masthead__row">
            <h1>Attracting the backpacker segment in Bangkok</h1>
          </div>
          <p className="masthead__sub">
            A data-driven read on how Airbnb hosts can win budget travellers — built on
            6,619 Bangkok listings priced under ฿2,000 a night, with every statistical
            test recomputed live as you filter.
          </p>
          <div className="masthead__meta">
            <span>Yonathan Hary Hutagalung</span>
            <span>·</span>
            <span>Source: EDA_AirBNB.ipynb</span>
            <span>·</span>
            <span>6,619 listings · 49 districts · 2,829 hosts</span>
          </div>
        </header>

        <nav className="nav" aria-label="Sections">
          <div className="nav__inner">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="nav__tab"
                aria-current={tab === t.id}
                onClick={() => select(t.id)}
              >
                {t.label}
              </button>
            ))}
            <ThemeToggle />
          </div>
        </nav>

        {/* One filter row above everything it scopes. Method describes the
            pipeline itself, so it is deliberately outside the filtered slice. */}
        {tab !== 'method' && (
          <FilterBar
            filters={filters}
            onChange={setFilters}
            matched={rows.length}
            total={LISTINGS.length}
          />
        )}

        <main id="main" className="section" style={{ marginTop: tab === 'method' ? 28 : 0 }}>
          {tab === 'overview' && <Overview rows={rows} slice={slice} />}
          {tab === 'pricing' && <Pricing rows={rows} slice={slice} />}
          {tab === 'geography' && <Geography rows={rows} slice={slice} />}
          {tab === 'competition' && <Competition rows={rows} slice={slice} />}
          {tab === 'method' && <Method />}
        </main>

        <footer className="footer">
          <span>
            Built from the raw Airbnb Bangkok export. Cleaning replicates{' '}
            <code>EDA_AirBNB.ipynb</code> exactly and is verified against its printed row
            counts at build time.
          </span>
          <span>Reviews are a proxy for bookings, not a count of them.</span>
        </footer>
      </div>
    </>
  );
}
