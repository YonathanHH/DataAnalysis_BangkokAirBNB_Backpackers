import { useId } from 'react';
import { int } from '../lib/format';
import {
  HOST_TYPES,
  NEIGHBOURHOODS,
  PRICE_SEGMENTS,
  ROOM_TYPES,
  isDefaultFilters,
  type Filters,
} from '../lib/listings';

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  matched: number;
  total: number;
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | 'All';
  options: readonly T[];
  onChange: (v: T | 'All') => void;
}) {
  const id = useId();
  return (
    <div className="filters__field">
      <label className="filters__label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | 'All')}>
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * One filter row above everything it scopes. Every chart on every tab
 * re-renders against the same slice — there are no per-card filters.
 */
export function FilterBar({ filters, onChange, matched, total }: Props) {
  const pristine = isDefaultFilters(filters);
  return (
    <div className="filters" role="group" aria-label="Filter listings">
      <Select
        label="Room type"
        value={filters.roomType}
        options={ROOM_TYPES}
        onChange={(roomType) => onChange({ ...filters, roomType })}
      />
      <Select
        label="Price segment"
        value={filters.priceSegment}
        options={PRICE_SEGMENTS}
        onChange={(priceSegment) => onChange({ ...filters, priceSegment })}
      />
      <Select
        label="Host type"
        value={filters.hostType}
        options={HOST_TYPES}
        onChange={(hostType) => onChange({ ...filters, hostType })}
      />
      <Select
        label="Neighbourhood"
        value={filters.neighbourhood}
        options={NEIGHBOURHOODS}
        onChange={(neighbourhood) => onChange({ ...filters, neighbourhood })}
      />

      <button
        type="button"
        className="filters__reset"
        disabled={pristine}
        onClick={() =>
          onChange({
            roomType: 'All',
            priceSegment: 'All',
            hostType: 'All',
            neighbourhood: 'All',
          })
        }
      >
        Reset
      </button>

      <p className="filters__count" aria-live="polite">
        <b>{int(matched)}</b> of {int(total)} listings
      </p>
    </div>
  );
}
