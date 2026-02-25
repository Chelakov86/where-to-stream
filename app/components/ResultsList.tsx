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
  selectedTitle,
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
    return <p className="text-center text-cream-text/60">No results found.</p>;
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-0" role="list">
        {results.map((result) => (
          <li key={`${result.type}-${result.id}`} className="list-none">
            <ResultItem
              result={result}
              onSelectResult={onSelectResult}
              isSelected={
                selectedTitle?.id === result.id && selectedTitle?.type === result.type
              }
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-center items-center space-x-4 mt-6">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 bg-muted-violet/50 border border-golden-bronze/30 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-gold hover:text-midnight-plum-end hover:border-primary-gold transition-all"
          aria-label="Previous Page"
        >
          Previous
        </button>
        <span className="text-cream-text">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-4 py-2 bg-muted-violet/50 border border-golden-bronze/30 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-gold hover:text-midnight-plum-end hover:border-primary-gold transition-all"
          aria-label="Next Page"
        >
          Next
        </button>
      </div>
    </div>
  );
};
