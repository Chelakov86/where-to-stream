import React from 'react';
import { ResultItem } from './ResultItem';
import { ResultItemSkeleton } from './Skeleton';
import { ResultsListProps } from '@/app/types';

export const ResultsList: React.FC<ResultsListProps> = ({
  results,
  page,
  totalPages,
  isLoading = false,
  onPageChange,
  onSelectResult,
  genreNamesById,
}) => {
  // Show loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <ul
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-0"
          role="list"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="list-none">
              <ResultItemSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="text-center text-text-secondary">No results found.</p>;
  }

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text sm:text-3xl">Search results</h2>
          <p className="mt-1 text-sm font-semibold text-text-secondary">
            Best match first, then adjacent titles and alternates.
          </p>
        </div>
        <p className="hidden text-xs font-black uppercase tracking-[0.16em] text-text-secondary sm:block">
          {results.length} titles
        </p>
      </div>

      <ul
        className="grid grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3"
        role="list"
        aria-live="polite"
      >
        {results.map((result, index) => (
          <li
            key={`${result.type}-${result.id}`}
            className={`list-none ${index === 0 ? 'md:col-span-2 xl:col-span-3' : ''}`}
          >
            <ResultItem
              result={result}
              onSelectResult={onSelectResult}
              isFeatured={index === 0}
              genreNamesById={genreNamesById}
            />
          </li>
        ))}
      </ul>

      <div className="mt-7 flex items-center justify-center gap-4">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous Page"
        >
          Previous
        </button>
        <span className="text-sm font-bold text-text-secondary">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next Page"
        >
          Next
        </button>
      </div>
    </div>
  );
};
