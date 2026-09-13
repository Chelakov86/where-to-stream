'use client';

import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Switch } from '@/app/components/ui/switch';
import SegmentedControl from '@/app/components/SegmentedControl';
import { SearchType, SortOption } from '@/app/searchContract';
import { Genre } from '@/app/types';
import { languageName } from '@/app/utils/format';
import { SearchPageState, activeFilterCount, effectiveSort } from '@/app/utils/searchPageState';
import { cn } from '@/app/utils/cn';

interface FiltersBarProps {
  state: SearchPageState;
  genres: Genre[];
  hasServices: boolean;
  onChange: (patch: Partial<SearchPageState>) => void;
}

const TYPES: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Series' },
];

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Best match',
  popularity: 'Most popular',
  rating: 'Highest rated',
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'A → Z',
};

const RATINGS = [0, 5, 6, 7, 8];
const LANGUAGES = [
  'en',
  'de',
  'fr',
  'es',
  'it',
  'ja',
  'ko',
  'hi',
  'pt',
  'sv',
  'da',
  'no',
  'tr',
  'zh',
];

const chipClass = (on: boolean) =>
  cn(
    'h-8 px-2.5 text-xs shadow-none',
    on
      ? 'border-primary bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
      : 'border-border text-muted-foreground hover:text-foreground'
  );

const labelClass = 'text-xs uppercase tracking-wide text-muted-foreground';

interface YearInputProps {
  id: string;
  label: string;
  placeholder: string;
  value?: number;
  onCommit: (year: number | undefined) => void;
}

/**
 * Year field that only commits empty or complete four-digit years, so typing
 * "2019" doesn't trigger searches for 2, 20 and 201 along the way.
 */
const YearInput: React.FC<YearInputProps> = ({ id, label, placeholder, value, onCommit }) => {
  const [text, setText] = useState(value ? String(value) : '');

  useEffect(() => setText(value ? String(value) : ''), [value]);

  const handleChange = (next: string) => {
    const digits = next.replace(/\D/g, '').slice(0, 4);
    setText(digits);
    if (digits === '') {
      onCommit(undefined);
    } else if (digits.length === 4) {
      onCommit(parseInt(digits, 10));
    }
  };

  return (
    <div>
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        className="mt-1"
      />
    </div>
  );
};

/**
 * Filter controls for the search page: media type, genre/year/rating/language
 * popover, "only my services" switch, and sort order.
 */
const FiltersBar: React.FC<FiltersBarProps> = ({ state, genres, hasServices, onChange }) => {
  const activeCount = activeFilterCount(state);
  const browsing = !state.query;
  const sortOptions = (Object.keys(SORT_LABELS) as SortOption[]).filter(
    (option) => !(browsing && option === 'relevance')
  );
  const sortedGenres = [...genres].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        label="Media type"
        options={TYPES}
        value={state.type}
        onChange={(type) => onChange({ type })}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                <span className="sr-only">active: </span>
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-4">
          <fieldset>
            <legend className={labelClass}>Genres</legend>
            <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {sortedGenres.map((genre) => {
                const on = state.genreIds.includes(genre.id);
                return (
                  <Button
                    key={genre.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={on}
                    onClick={() =>
                      onChange({
                        genreIds: on
                          ? state.genreIds.filter((id) => id !== genre.id)
                          : [...state.genreIds, genre.id],
                      })
                    }
                    className={cn(chipClass(on), 'rounded-full')}
                  >
                    {genre.name}
                  </Button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <YearInput
              id="year-from"
              label="Year from"
              placeholder="1900"
              value={state.yearFrom}
              onCommit={(yearFrom) => onChange({ yearFrom })}
            />
            <YearInput
              id="year-to"
              label="Year to"
              placeholder={String(new Date().getFullYear())}
              value={state.yearTo}
              onCommit={(yearTo) => onChange({ yearTo })}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>Minimum rating</legend>
            <div className="mt-2 flex gap-1.5">
              {RATINGS.map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={state.minRating === rating}
                  onClick={() => onChange({ minRating: rating })}
                  className={cn(chipClass(state.minRating === rating), 'flex-1')}
                >
                  {rating === 0 ? 'Any' : `${rating}+`}
                </Button>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="language" className={labelClass}>
              Original language
            </Label>
            <select
              id="language"
              value={state.language}
              onChange={(event) => onChange({ language: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/35"
            >
              <option value="">Any language</option>
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {languageName(code)}
                </option>
              ))}
            </select>
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() =>
                onChange({
                  genreIds: [],
                  yearFrom: undefined,
                  yearTo: undefined,
                  minRating: 0,
                  language: '',
                })
              }
            >
              <X aria-hidden="true" /> Reset filters
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <div className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3">
        <Switch
          id="only-mine"
          checked={state.mine && hasServices}
          disabled={!hasServices}
          onCheckedChange={(mine) => onChange({ mine })}
        />
        <Label
          htmlFor="only-mine"
          className="cursor-pointer text-sm text-muted-foreground"
          title={hasServices ? undefined : 'Pick your services first'}
        >
          Only my services
        </Label>
      </div>

      <div className="ml-auto">
        <Label htmlFor="sort" className="sr-only">
          Sort results
        </Label>
        <select
          id="sort"
          value={effectiveSort(state)}
          onChange={(event) => onChange({ sort: event.target.value as SortOption })}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/35"
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FiltersBar;
