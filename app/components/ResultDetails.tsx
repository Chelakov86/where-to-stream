'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CountryAvailability, TitleDetails, Genre } from '@/app/types';
import { getCountryFlagUrl } from '@/app/utils/countries';
import { ResultDetailsSkeleton } from './Skeleton';

interface ResultDetailsProps {
  title: {
    id: number;
    type: 'movie' | 'tv';
  };
  onError?: (message: string | null) => void;
}

type Status = 'loading' | 'error' | 'success';

const formatRuntime = (runtime: number) => {
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const AvailabilityTable = ({
  title,
  countries,
  defaultCollapsed = false,
}: {
  title: string;
  countries: CountryAvailability[];
  defaultCollapsed?: boolean;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [filterQuery, setFilterQuery] = useState('');
  const isOtherCountries = title === 'Other Countries';

  const filteredCountries = filterQuery
    ? countries.filter((c) => c.countryName.toLowerCase().includes(filterQuery.toLowerCase()))
    : countries;

  // Collapsible header for "Other Countries"
  if (isOtherCountries && isCollapsed) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.05] p-3 transition hover:border-white/20 hover:bg-white/[0.08]"
          aria-expanded={false}
        >
          <span className="text-base font-black text-text sm:text-lg">
            Available in {countries.length} other {countries.length === 1 ? 'country' : 'countries'}
          </span>
          <span className="text-sm font-black text-accent-primary">Show</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h4 className="text-base font-black text-text sm:text-lg">{title}</h4>
        {isOtherCountries && (
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(true);
              setFilterQuery('');
            }}
            className="text-sm font-black text-text-secondary transition hover:text-text"
          >
            Hide
          </button>
        )}
      </div>

      {/* Country search filter for Other Countries */}
      {isOtherCountries && (
        <div className="mb-3">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by country name..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-text outline-none transition placeholder:text-text-secondary/60 focus:border-accent-primary/70 focus:ring-2 focus:ring-accent-primary/20"
            aria-label="Filter countries"
          />
        </div>
      )}

      {/* Mobile: Card layout */}
      <div
        className={`block md:hidden space-y-3 ${isOtherCountries ? 'max-h-[400px] overflow-y-auto custom-scrollbar pr-1' : ''}`}
      >
        {filteredCountries.map((country) => (
          <div
            key={country.countryCode}
            className="rounded-xl border border-white/10 bg-white/[0.05] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center font-black text-text">
                <Image
                  src={getCountryFlagUrl(country.countryCode)}
                  alt={`${country.countryName} flag`}
                  width={20}
                  height={15}
                  className="mr-2 inline-block"
                  unoptimized
                />
                {country.countryName}
              </span>
              {country.watchLink && (
                <a
                  href={country.watchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-black text-accent-primary hover:underline"
                >
                  Watch →
                </a>
              )}
            </div>
            <div className="space-y-1 text-sm">
              {country.freeProviders.length > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="flex-shrink-0 text-text-secondary">Free:</span>
                  <span className="text-right text-text">{country.freeProviders.join(', ')}</span>
                </div>
              )}
              {country.paidProviders.length > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="flex-shrink-0 text-text-secondary">Paid:</span>
                  <span className="text-right text-text">{country.paidProviders.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredCountries.length === 0 && filterQuery && (
          <p className="py-2 text-center text-sm text-text-secondary">
            No countries match &quot;{filterQuery}&quot;
          </p>
        )}
      </div>

      {/* Desktop: Table layout */}
      <div className={isOtherCountries ? 'max-h-[400px] overflow-y-auto custom-scrollbar' : ''}>
        <table
          className="hidden w-full table-fixed overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] md:table"
          aria-label={title}
          style={{ tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="bg-black/24">
              <th
                className={`border-b border-white/10 bg-[#10151d] px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-text-secondary ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Country
              </th>
              <th
                className={`border-b border-white/10 bg-[#10151d] px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-text-secondary ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Free Providers
              </th>
              <th
                className={`border-b border-white/10 bg-[#10151d] px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-text-secondary ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Paid Providers
              </th>
              <th
                className={`border-b border-white/10 bg-[#10151d] px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-text-secondary ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCountries.map((country) => (
              <tr key={country.countryCode} className="hover:bg-white/[0.04]">
                <td className="truncate border-b border-white/[0.08] px-4 py-2 font-semibold text-text">
                  <div className="flex items-center">
                    <Image
                      src={getCountryFlagUrl(country.countryCode)}
                      alt={`${country.countryName} flag`}
                      width={20}
                      height={15}
                      className="mr-2"
                      unoptimized
                    />
                    {country.countryName}
                  </div>
                </td>
                <td
                  className="border-b border-white/[0.08] px-4 py-2 text-text-secondary"
                  title={country.freeProviders.join(', ')}
                >
                  {country.freeProviders.length > 0 ? country.freeProviders.join(', ') : '-'}
                </td>
                <td
                  className="border-b border-white/[0.08] px-4 py-2 text-text-secondary"
                  title={country.paidProviders.join(', ')}
                >
                  {country.paidProviders.length > 0 ? country.paidProviders.join(', ') : '-'}
                </td>
                <td className="border-b border-white/[0.08] px-4 py-2">
                  {country.watchLink && (
                    <a
                      href={country.watchLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-accent-primary hover:underline"
                    >
                      Watch
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filteredCountries.length === 0 && filterQuery && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-text-secondary">
                  No countries match &quot;{filterQuery}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ERROR_MESSAGE = "We're having trouble fetching data right now. Please try again later.";

const ResultDetails = ({ title: { id, type }, onError }: ResultDetailsProps) => {
  const [status, setStatus] = useState<Status>('loading');
  const [details, setDetails] = useState<TitleDetails | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/title/${type}/${id}`, { signal });
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();
        setDetails(data);
        setStatus('success');
        onError?.(null);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setStatus('error');
          onError?.(ERROR_MESSAGE);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [id, onError, type]);

  if (status === 'loading') {
    return <ResultDetailsSkeleton />;
  }

  if (status === 'error') {
    return <div className="p-8 text-center text-red-400">{ERROR_MESSAGE}</div>;
  }

  if (!details) {
    return null;
  }

  const hasAvailability =
    details.availability.userCountry !== null || details.availability.otherCountries.length > 0;

  // Check if user country has providers
  const userCountryHasProviders =
    details.availability.userCountry &&
    (details.availability.userCountry.freeProviders.length > 0 ||
      details.availability.userCountry.paidProviders.length > 0);

  const titleHeadingId = `result-details-${details.id}-title`;

  return (
    <section
      className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#141a22]/90 p-4 text-text shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:p-5 md:p-6"
      aria-labelledby={titleHeadingId}
      role="region"
    >
      <div className="grid gap-5 md:grid-cols-[16rem_minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <Image
            src={details.posterUrl}
            alt={`Poster for ${details.title}`}
            width={300}
            height={450}
            className="mx-auto aspect-[2/3] w-52 rounded-xl object-cover shadow-2xl shadow-black/40 md:w-full"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent-primary">
            Selected title
          </p>
          <h2
            id={titleHeadingId}
            className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl"
          >
            {details.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-black text-text-secondary">
            <span>{details.year}</span>
            <span className="h-1 w-1 rounded-full bg-text-secondary/50" />
            <span>{details.type === 'movie' ? 'Movie' : 'TV Show'}</span>
            {details.runtime && <span className="h-1 w-1 rounded-full bg-text-secondary/50" />}
            {details.runtime && <span>{formatRuntime(details.runtime)}</span>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {details.genres.map((g: Genre) => (
              <span
                key={g.id}
                className="rounded-md bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-text-secondary"
              >
                {g.name}
              </span>
            ))}
          </div>
          <div
            className="mt-5 inline-flex items-center rounded-full border border-[#ffd36e]/30 bg-[#ffd36e]/10 px-3 py-1.5 text-sm font-black"
            data-testid="rating"
          >
            <span className="mr-1 text-[#ffd36e]" aria-hidden="true">
              ★
            </span>
            {details.rating.toFixed(1)}/10
          </div>
          <p className="mt-5 max-w-3xl text-base leading-8 text-text-secondary">
            {details.overview}
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h3 className="border-b border-white/10 pb-3 text-2xl font-black sm:text-3xl">
          Streaming Availability
        </h3>
        {!hasAvailability ? (
          <p className="mt-4 text-text-secondary">No streaming availability found.</p>
        ) : (
          <div>
            {/* User's country section - shown if detected */}
            {details.availability.userCountry && (
              <>
                {userCountryHasProviders ? (
                  <AvailabilityTable
                    title={`Available in Your Country (${details.availability.userCountry.countryName})`}
                    countries={[details.availability.userCountry]}
                  />
                ) : (
                  <div className="mt-4">
                    <h4 className="mb-2 text-base font-black text-text sm:mb-3 sm:text-lg">
                      Not Available in Your Country ({details.availability.userCountry.countryName})
                    </h4>
                    <p className="text-text-secondary">
                      This title is not available for streaming in your country.
                    </p>
                  </div>
                )}
              </>
            )}
            {details.availability.otherCountries.length > 0 && (
              <AvailabilityTable
                title="Other Countries"
                countries={details.availability.otherCountries}
                defaultCollapsed={true}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ResultDetails;
