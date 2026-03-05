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
    ? countries.filter((c) =>
      c.countryName.toLowerCase().includes(filterQuery.toLowerCase())
    )
    : countries;

  // Collapsible header for "Other Countries"
  if (isOtherCountries && isCollapsed) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="w-full flex items-center justify-between p-3 bg-muted-violet/40 hover:bg-muted-violet/60 border border-golden-bronze/30 rounded-lg transition-colors"
          aria-expanded={false}
        >
          <span className="text-base sm:text-lg font-semibold text-white">
            Available in {countries.length} other {countries.length === 1 ? 'country' : 'countries'}
          </span>
          <span className="text-cream-text/60 text-sm">Show ▸</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h4 className="text-base sm:text-lg font-semibold text-white">{title}</h4>
        {isOtherCountries && (
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(true);
              setFilterQuery('');
            }}
            className="text-sm text-cream-text/60 hover:text-white transition-colors"
          >
            Hide ◂
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
            className="w-full p-2 text-sm bg-muted-violet/50 border border-golden-bronze/40 rounded-lg placeholder-cream-text/40 focus:border-primary-gold focus:ring-1 focus:ring-primary-gold/30 transition-colors"
            aria-label="Filter countries"
          />
        </div>
      )}

      {/* Mobile: Card layout */}
      <div className={`block 2xl:hidden space-y-3 ${isOtherCountries ? 'max-h-[400px] overflow-y-auto custom-scrollbar pr-1' : ''}`}>
        {filteredCountries.map((country) => (
          <div
            key={country.countryCode}
            className="bg-muted-violet/40 p-3 rounded-lg border border-golden-bronze/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white flex items-center">
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
                  className="text-primary-gold hover:text-primary-gold/80 text-sm font-medium transition-colors"
                >
                  Watch →
                </a>
              )}
            </div>
            <div className="space-y-1 text-sm">
              {country.freeProviders.length > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-cream-text/60 flex-shrink-0">Free:</span>
                  <span className="text-white text-right">{country.freeProviders.join(', ')}</span>
                </div>
              )}
              {country.paidProviders.length > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-cream-text/60 flex-shrink-0">Paid:</span>
                  <span className="text-white text-right">{country.paidProviders.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredCountries.length === 0 && filterQuery && (
          <p className="text-sm text-cream-text/60 text-center py-2">No countries match &quot;{filterQuery}&quot;</p>
        )}
      </div>

      {/* Desktop: Table layout */}
      <div className={isOtherCountries ? 'max-h-[400px] overflow-y-auto custom-scrollbar' : ''}>
        <table
          className="hidden 2xl:table w-full bg-muted-violet/30 border border-golden-bronze/30 table-fixed rounded-lg overflow-hidden"
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
            <tr className="bg-midnight-plum-end/80">
              <th
                className={`py-2 px-4 border-b border-golden-bronze/30 text-left bg-midnight-plum-end/80 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Country
              </th>
              <th
                className={`py-2 px-4 border-b border-golden-bronze/30 text-left bg-midnight-plum-end/80 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Free Providers
              </th>
              <th
                className={`py-2 px-4 border-b border-golden-bronze/30 text-left bg-midnight-plum-end/80 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Paid Providers
              </th>
              <th
                className={`py-2 px-4 border-b border-golden-bronze/30 text-left bg-midnight-plum-end/80 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
              >
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCountries.map((country) => (
              <tr key={country.countryCode} className="hover:bg-muted-violet/40">
                <td className="py-2 px-4 border-b border-golden-bronze/20 truncate">
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
                  className="py-2 px-4 border-b border-golden-bronze/20"
                  title={country.freeProviders.join(', ')}
                >
                  {country.freeProviders.length > 0 ? country.freeProviders.join(', ') : '-'}
                </td>
                <td
                  className="py-2 px-4 border-b border-golden-bronze/20"
                  title={country.paidProviders.join(', ')}
                >
                  {country.paidProviders.length > 0 ? country.paidProviders.join(', ') : '-'}
                </td>
                <td className="py-2 px-4 border-b border-gray-600">
                  {country.watchLink && (
                    <a
                      href={country.watchLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-gold hover:text-primary-gold/80 transition-colors"
                    >
                      Watch
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filteredCountries.length === 0 && filterQuery && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-cream-text/60 text-sm">
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
      className="glass-panel rounded-xl text-white shadow-lg p-4 sm:p-5 md:p-6 max-w-4xl mx-auto"
      aria-labelledby={titleHeadingId}
      role="region"
    >
      <div className="flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-6">
        <div className="md:w-1/3">
          <Image
            src={details.posterUrl}
            alt={`Poster for ${details.title}`}
            width={300}
            height={450}
            className="rounded-lg w-full h-auto"
            priority
          />
        </div>
        <div className="md:w-2/3">
          <h2 id={titleHeadingId} className="text-2xl sm:text-3xl md:text-4xl font-bold">
            {details.title}
          </h2>
          <div className="flex items-center space-x-4 text-cream-text/70 mt-2">
            <span>{details.year}</span>
            <span>{details.type === 'movie' ? 'Movie' : 'TV Show'}</span>
            {details.runtime && <span>{formatRuntime(details.runtime)}</span>}
          </div>
          <div className="mt-4">
            <span className="font-semibold">Genres:</span>{' '}
            {details.genres.map((g: Genre) => g.name).join(', ')}
          </div>
          <div className="mt-4" data-testid="rating">
            <span className="font-semibold">Rating:</span> {details.rating.toFixed(1)}/10
          </div>
          <p className="mt-4 text-cream-text/80">{details.overview}</p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-golden-bronze/30 pb-2">
          Streaming Availability
        </h3>
        {!hasAvailability ? (
          <p className="mt-4 text-cream-text/60">No streaming availability found.</p>
        ) : (
          <div className="-mx-6 px-6">
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
                    <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                      Not Available in Your Country ({details.availability.userCountry.countryName})
                    </h4>
                    <p className="text-cream-text/60">
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
