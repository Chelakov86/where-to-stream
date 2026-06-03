import React from 'react';
import Image from 'next/image';
import { NormalizedSearchResult } from '@/app/types';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';

interface ResultItemProps {
  result: NormalizedSearchResult;
  onSelectResult: (result: NormalizedSearchResult) => void;
  isFeatured?: boolean;
  genreNamesById?: Record<number, string>;
}

export const ResultItem: React.FC<ResultItemProps> = ({
  result,
  onSelectResult,
  isFeatured = false,
  genreNamesById,
}) => {
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
  const titleWithYear = `${title}${year ? ` (${year})` : ''}`;
  const displayedGenres =
    genres?.slice(0, 3).map((genreId) => genreNamesById?.[genreId] ?? String(genreId)) || [];

  return (
    <article
      aria-labelledby={titleId}
      className={`group h-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#141a22]/[0.88] text-text shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-accent-primary/[0.35] hover:shadow-[0_24px_70px_rgba(0,0,0,0.32)] ${
        isFeatured
          ? 'grid gap-5 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:p-5 lg:grid-cols-[13rem_minmax(0,1fr)]'
          : 'flex gap-3 p-3'
      }`}
      onClick={() => onSelectResult(result)}
      role="article"
    >
      <div className="flex-shrink-0">
        {posterPath ? (
          <Image
            src={posterPath}
            alt={`${title} poster`}
            width={isFeatured ? 208 : 100}
            height={isFeatured ? 312 : 150}
            className={`rounded-lg object-cover shadow-2xl shadow-black/[0.35] ${
              isFeatured
                ? 'mx-auto aspect-[2/3] w-36 sm:w-full'
                : 'h-[7.5rem] w-20 sm:h-[8.5rem] sm:w-24'
            }`}
          />
        ) : (
          <div
            data-testid="poster-placeholder"
            className={`grid place-items-center rounded-lg border border-white/10 bg-white/[0.06] ${
              isFeatured
                ? 'mx-auto aspect-[2/3] w-36 sm:w-full'
                : 'h-[7.5rem] w-20 sm:h-[8.5rem] sm:w-24'
            }`}
          >
            <span className="text-xs font-black uppercase tracking-[0.12em] text-text-secondary">
              No Image
            </span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {isFeatured && (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent-primary">
            Best match
          </p>
        )}
        <h3
          id={titleId}
          className={`font-black leading-tight text-text ${
            isFeatured ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'
          }`}
        >
          {titleWithYear}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
              type === 'movie'
                ? 'bg-accent-secondary/[0.16] text-accent-secondary'
                : 'bg-[#b28cff]/[0.18] text-[#d8c6ff]'
            }`}
          >
            {type === 'movie' ? 'Movie' : 'Series'}
          </span>
          {rating && (
            <div className="flex items-center text-sm font-black text-[#ffd36e]">
              <span aria-hidden="true">★</span>
              <span className="ml-1 text-text">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {displayedGenres.map((genre) => (
            <span
              key={genre}
              className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-bold text-text-secondary"
            >
              {genre}
            </span>
          ))}
        </div>
        {isFeatured && (
          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-text-secondary">
            {result.overview ||
              'Open details to compare streaming availability by country and provider.'}
          </p>
        )}
        <div className="mt-auto pt-4">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onSelectResult(result);
            }}
            className="rounded-lg bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#10141a] transition hover:bg-accent-primary focus:outline-none focus:ring-4 focus:ring-accent-primary/25"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
};
