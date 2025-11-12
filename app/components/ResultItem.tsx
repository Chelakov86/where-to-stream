import React from 'react';
import Image from 'next/image';
import { NormalizedSearchResult } from '@/app/types';

interface ResultItemProps {
  result: NormalizedSearchResult;
  onSelectResult: (result: NormalizedSearchResult) => void;
}

export const ResultItem: React.FC<ResultItemProps> = ({ result, onSelectResult }) => {
  const { title, year, type, posterUrl, rating, genres } = result;
  const posterPath = posterUrl ? `https://image.tmdb.org/t/p/w200${posterUrl}` : null;

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-4 flex space-x-4">
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
        <h3 className="text-xl font-bold">
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
    </div>
  );
};
