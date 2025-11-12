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
}) => (
  <div className="mt-4">
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full bg-gray-800 border border-gray-700" aria-label={title}>
        <thead>
          <tr className="bg-gray-900">
            <th className="py-2 px-4 border-b border-gray-700 text-left">Country</th>
            <th className="py-2 px-4 border-b border-gray-700 text-left">Netflix</th>
            <th className="py-2 px-4 border-b border-gray-700 text-left">Free / Ads</th>
            <th className="py-2 px-4 border-b border-gray-700 text-left">Link</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country.countryCode} className="hover:bg-gray-700">
              <td className="py-2 px-4 border-b border-gray-600">
                {countryFlagMapping[country.countryCode] || ''} {country.countryName}
              </td>
              <td className="py-2 px-4 border-b border-gray-600">
                {country.hasNetflix ? 'Yes' : 'No'}
              </td>
              <td className="py-2 px-4 border-b border-gray-600">
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
  </div>
);

const ERROR_MESSAGE = 'We’re having trouble fetching data right now. Please try again later.';

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
    return (
      <div className="p-8 text-center text-red-400">
        {ERROR_MESSAGE}
      </div>
    );
  }

  if (!details) {
    return null;
  }

  const hasAvailability =
    details.availability.preferredCountries.length > 0 ||
    details.availability.otherCountries.length > 0;

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3">
          <img src={details.posterUrl} alt={details.title} className="rounded-lg w-full" />
        </div>
        <div className="md:w-2/3">
          <h1 className="text-4xl font-bold">{details.title}</h1>
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

      <div className="mt-8">
        <h2 className="text-2xl font-bold border-b-2 border-gray-700 pb-2">
          Streaming Availability
        </h2>
        {!hasAvailability ? (
          <p className="mt-4 text-gray-400">No streaming availability found.</p>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ResultDetails;
