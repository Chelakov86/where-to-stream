import React from 'react';
import Image from 'next/image';
import { NormalizedSearchResult } from '@/app/types';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';

interface ResultItemProps {
  result: NormalizedSearchResult;
  onSelectResult: (result: NormalizedSearchResult) => void;
}

export const ResultItem: React.FC<ResultItemProps> = ({ result, onSelectResult }) => {
  const { title, year, type, posterUrl, rating } = result;

  // Build poster URL at w200 size for the card thumbnail
  let posterPath: string | undefined = undefined;
  if (posterUrl) {
    if (posterUrl.startsWith('http')) {
      const urlMatch = posterUrl.match(/\/t\/p\/w\d+\/(.+)$/);
      if (urlMatch) {
        posterPath = buildTmdbImageUrl(`/${urlMatch[1]}`, 'w200');
      }
    } else {
      posterPath = buildTmdbImageUrl(posterUrl, 'w200');
    }
  }

  const titleId = `result-${result.type}-${result.id}-title`;
  const isMovie = type === 'movie';

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col rounded-xl overflow-hidden bg-[#2A1B38]/60 border border-[#4A3B28]/30 hover:border-[#F5B041]/40 transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,176,65,0.1)] group h-full"
      role="article"
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] flex-shrink-0 overflow-hidden bg-[#1A0F1F]">
        {posterPath ? (
          <Image
            src={posterPath}
            alt={`${title} poster`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div
            data-testid="poster-placeholder"
            className="w-full h-full flex items-center justify-center"
          >
            <svg
              className="w-12 h-12 text-[#4A3B28]"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
            </svg>
          </div>
        )}

        {/* Type badge overlay */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full backdrop-blur-sm ${
              isMovie ? 'bg-blue-600/80 text-blue-100' : 'bg-purple-600/80 text-purple-100'
            }`}
          >
            {isMovie ? 'Movie' : 'Series'}
          </span>
        </div>

        {/* Rating badge overlay */}
        {rating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-xs text-white font-medium">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <h3 id={titleId} className="text-sm font-semibold text-white leading-snug line-clamp-2">
          {title}
          {year && <span className="text-white/50 font-normal ml-1">({year})</span>}
        </h3>
        <div className="mt-auto pt-2">
          <button
            onClick={() => onSelectResult(result)}
            className="w-full bg-[#F5B041]/10 hover:bg-[#F5B041] text-[#F5B041] hover:text-[#0A050F] border border-[#F5B041]/30 hover:border-[#F5B041] text-xs font-semibold py-1.5 px-3 rounded-lg transition-all duration-200"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
};
