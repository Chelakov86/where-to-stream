'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Pin } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import CountryFlag from '@/app/components/CountryFlag';
import EmptyState from '@/app/components/EmptyState';
import PageContainer from '@/app/components/PageContainer';
import { Skeleton } from '@/app/components/Skeleton';
import { useApiResource } from '@/app/hooks/useApiResource';
import { useActiveCountry, useMyServices, usePinnedCountries } from '@/app/hooks/usePreferences';
import { MediaType, OfferKind, TitleDetails } from '@/app/types';
import { providersOnMyServices, rankCountries } from '@/app/utils/availability';
import { pluralize } from '@/app/utils/format';
import { titleHref } from '@/app/utils/searchPageState';
import { cn } from '@/app/utils/cn';

interface CountriesViewProps {
  type: MediaType;
  id: number;
}

const OFFER_ROWS: [string, OfferKind][] = [
  ['Subscription', 'flatrate'],
  ['Free', 'free'],
  ['Rent', 'rent'],
  ['Buy', 'buy'],
];

/**
 * Country comparison page: every country that carries a title, with the user's
 * country and pinned countries first, filterable by name and by "my services".
 */
const CountriesView: React.FC<CountriesViewProps> = ({ type, id }) => {
  const { country } = useActiveCountry();
  const { services } = useMyServices();
  const { pinned, togglePinned } = usePinnedCountries();
  const [filter, setFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const { data: title, error, reload } = useApiResource<TitleDetails>(`/api/title/${type}/${id}`);

  const codes = useMemo(() => {
    if (!title) return [];
    const needle = filter.trim().toLowerCase();
    return rankCountries(title.availability, pinned, country).filter((code) => {
      const entry = title.availability[code];
      const matchesText =
        !needle ||
        entry.countryName.toLowerCase().includes(needle) ||
        code.toLowerCase().includes(needle);
      const matchesMine = !onlyMine || providersOnMyServices(entry, services).length > 0;
      return matchesText && matchesMine;
    });
  }, [title, filter, onlyMine, pinned, country, services]);

  return (
    <main>
      <PageContainer className="max-w-4xl pb-20 pt-6">
        <Link
          href={titleHref(type, id, country)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to title
        </Link>

        {error ? (
          <EmptyState
            className="mt-6"
            tone="danger"
            title="Couldn't load availability."
            description={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        ) : !title ? (
          <div className="mt-6 space-y-3" role="status" aria-label="Loading availability">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold">
              {title.title}: availability by country
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Listed in {pluralize(Object.keys(title.availability).length, 'country', 'countries')}.
              Pin the ones you care about to keep them on top.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label htmlFor="country-filter" className="sr-only">
                Filter countries
              </label>
              <Input
                id="country-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter countries…"
                className="min-w-48 flex-1"
              />
              <Button
                variant={onlyMine ? 'default' : 'outline'}
                aria-pressed={onlyMine}
                disabled={services.length === 0}
                onClick={() => setOnlyMine((value) => !value)}
              >
                On my services
              </Button>
            </div>

            {codes.length === 0 ? (
              <EmptyState className="mt-10" title="No countries match those filters." />
            ) : (
              <ul className="mt-5 space-y-3">
                {codes.map((code) => {
                  const entry = title.availability[code];
                  const onMyServices = providersOnMyServices(entry, services).length > 0;
                  const isHome = code === country;
                  const isPinned = pinned.includes(code);
                  return (
                    <li
                      key={code}
                      className={cn(
                        'rounded-lg border bg-card p-4 shadow-sm',
                        isHome ? 'border-primary/50' : 'border-border'
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <CountryFlag code={code} />
                        <h2 className="font-medium">{entry.countryName}</h2>
                        {isHome && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                            Your country
                          </span>
                        )}
                        {onMyServices && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                            <Check className="size-3" aria-hidden="true" /> On your services
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-pressed={isPinned}
                          aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${entry.countryName}`}
                          onClick={() => togglePinned(code)}
                          className={cn(
                            'ml-auto gap-1 shadow-none',
                            isPinned
                              ? 'border-primary/50 text-primary'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Pin className="size-3" aria-hidden="true" />
                          {isPinned ? 'Pinned' : 'Pin'}
                        </Button>
                      </div>

                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {OFFER_ROWS.map(([label, kind]) =>
                          entry[kind].length > 0 ? (
                            <div key={kind} className="flex gap-2">
                              <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                                {label}
                              </dt>
                              <dd className="flex-1 text-foreground/90">
                                {entry[kind].map((provider) => provider.name).join(', ')}
                              </dd>
                            </div>
                          ) : null
                        )}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </PageContainer>
    </main>
  );
};

export default CountriesView;
