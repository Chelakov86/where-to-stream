'use client';

import { useEffect, useState } from 'react';
import { CountryAvailability, TitleDetails, Genre } from '@/app/types';

interface ResultDetailsProps {
  title: {
    id: number;
    type: 'movie' | 'tv';
  };
  onError?: (message: string | null) => void;
}

type Status = 'loading' | 'error' | 'success';

const countryFlagMapping: Record<string, string> = {
  DE: '🇩🇪',
  GB: '🇬🇧',
  US: '🇺🇸',
  CA: '🇨🇦',
};

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
}: {
  title: string;
  countries: CountryAvailability[];
}) => {
  const isOtherCountries = title === 'Other Countries';

  return (
    <div className="mt-4">
      <h4 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">{title}</h4>

      {/* Mobile: Card layout */}
      <div className="block md:hidden space-y-3">
        {countries.map((country) => (
          <div
            key={country.countryCode}
            className="bg-gray-700 p-3 rounded-lg border border-gray-600"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">
                {countryFlagMapping[country.countryCode] || ''} {country.countryName}
              </span>
              {country.watchLink && (
                <a
                  href={country.watchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm font-medium"
                >
                  Watch →
                </a>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Netflix:</span>
                <span className="text-white">{country.hasNetflix ? 'Yes' : 'No'}</span>
              </div>
              {country.freeOrAdsProviders.length > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-400 flex-shrink-0">Other Services:</span>
                  <span className="text-white text-right">
                    {country.freeOrAdsProviders.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <table
        className="hidden md:table w-full bg-gray-800 border border-gray-700 table-fixed"
        aria-label={title}
        style={{ tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: '25%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '45%' }} />
          <col style={{ width: '15%' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-900">
            <th
              className={`py-2 px-4 border-b border-gray-700 text-left bg-gray-900 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
            >
              Country
            </th>
            <th
              className={`py-2 px-4 border-b border-gray-700 text-left bg-gray-900 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
            >
              Netflix
            </th>
            <th
              className={`py-2 px-4 border-b border-gray-700 text-left bg-gray-900 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
            >
              Other Streaming Services
            </th>
            <th
              className={`py-2 px-4 border-b border-gray-700 text-left bg-gray-900 ${isOtherCountries ? 'sticky top-0 z-10' : ''}`}
            >
              Link
            </th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country.countryCode} className="hover:bg-gray-700">
              <td className="py-2 px-4 border-b border-gray-600 truncate">
                {countryFlagMapping[country.countryCode] || ''} {country.countryName}
              </td>
              <td className="py-2 px-4 border-b border-gray-600">
                {country.hasNetflix ? 'Yes' : 'No'}
              </td>
              <td
                className="py-2 px-4 border-b border-gray-600 truncate"
                title={country.freeOrAdsProviders.join(', ')}
              >
                {country.freeOrAdsProviders.join(', ')}
              </td>
              <td className="py-2 px-4 border-b border-gray-600">
                {country.watchLink && (
                  <a
                    href={country.watchLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Watch
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    return <div className="p-8 text-center text-gray-400">Loading details...</div>;
  }

  if (status === 'error') {
    return <div className="p-8 text-center text-red-400">{ERROR_MESSAGE}</div>;
  }

  if (!details) {
    return null;
  }

  const hasAvailability =
    details.availability.preferredCountries.length > 0 ||
    details.availability.otherCountries.length > 0;

  const titleHeadingId = `result-details-${details.id}-title`;

  return (
    <section
      className="bg-gray-800 text-white rounded-lg shadow-lg p-4 sm:p-5 md:p-6 max-w-4xl mx-auto"
      aria-labelledby={titleHeadingId}
      role="region"
    >
      <div className="flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-6">
        <div className="md:w-1/3">
          <img
            src={details.posterUrl}
            alt={`Poster for ${details.title}`}
            className="rounded-lg w-full"
          />
        </div>
        <div className="md:w-2/3">
          <h2 id={titleHeadingId} className="text-2xl sm:text-3xl md:text-4xl font-bold">
            {details.title}
          </h2>
          <div className="flex items-center space-x-4 text-gray-400 mt-2">
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
          <p className="mt-4 text-gray-300">{details.overview}</p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h3 className="text-xl sm:text-2xl font-bold border-b-2 border-gray-700 pb-2">
          Streaming Availability
        </h3>
        {!hasAvailability ? (
          <p className="mt-4 text-gray-400">No streaming availability found.</p>
        ) : (
          <div className="-mx-6 px-6">
            {details.availability.preferredCountries.length > 0 && (
              <AvailabilityTable
                title="Available in Your Region"
                countries={details.availability.preferredCountries}
              />
            )}
            {details.availability.otherCountries.length > 0 && (
              <AvailabilityTable
                title="Other Countries"
                countries={details.availability.otherCountries}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ResultDetails;
