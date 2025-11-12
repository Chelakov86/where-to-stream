import React from 'react';
import Image from 'next/image';
import { NormalizedSearchResult } from '@/app/types';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';

interface ResultItemProps {
  result: NormalizedSearchResult;
  onSelectResult: (result: NormalizedSearchResult) => void;
}

export const ResultItem: React.FC<ResultItemProps> = ({ result, onSelectResult }) => {
  const { title, year, type, posterUrl, rating, genres } = result;
  // Extract poster path from full URL and rebuild with smaller size for list view
  let posterPath: string | undefined = undefined;
  if (posterUrl) {
    if (posterUrl.startsWith('http')) {
      // Extract path from full URL (e.g., "https://image.tmdb.org/t/p/w500/abc.jpg" -> "/abc.jpg")
      const urlMatch = posterUrl.match(/\/t\/p\/w\d+\/(.+)$/);
      if (urlMatch) {
        posterPath = buildTmdbImageUrl(`/${urlMatch[1]}`, 'w200');
      }
    } else {
      // Already a path, just rebuild with different size
      posterPath = buildTmdbImageUrl(posterUrl, 'w200');
    }
  }
  const titleId = `result-${result.type}-${result.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="bg-gray-800 rounded-lg shadow-md p-4 flex space-x-4"
      role="article"
    >
      <div className="flex-shrink-0">
        {posterPath ? (
          <Image
            src={posterPath}
            alt={`${title} poster`}
            width={100}
            height={150}
            className="rounded-md"
          />
        ) : (
          <div
            data-testid="poster-placeholder"
            className="w-[100px] h-[150px] bg-gray-700 rounded-md flex items-center justify-center"
          >
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
      </div>
      <div className="flex-grow">
        <h3 id={titleId} className="text-xl font-bold">
          {title} {year && `(${year})`}
        </h3>
        <div className="flex items-center space-x-2 mt-1">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              type === 'movie' ? 'bg-blue-600 text-blue-100' : 'bg-purple-600 text-purple-100'
            }`}
          >
            {type === 'movie' ? 'Movie' : 'Series'}
          </span>
          {rating && (
            <div className="flex items-center">
              <span className="text-yellow-400">&#9733;</span>
              <span className="ml-1">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {genres?.slice(0, 3).map((genreId) => (
            <span key={genreId} className="bg-gray-700 text-gray-300 px-2 py-1 text-xs rounded-md">
              {genreId}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={() => onSelectResult(result)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
};
