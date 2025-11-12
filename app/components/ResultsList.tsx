import React from 'react';
import { ResultItem } from './ResultItem';
import { ResultsListProps } from '@/app/types';

export const ResultsList: React.FC<ResultsListProps> = ({
  results,
  page,
  totalPages,
  onPageChange,
  onSelectResult,
}) => {
  if (results.length === 0) {
    return <p className="text-center text-gray-400">No results found.</p>;
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <ul className="grid grid-cols-1 gap-4 p-0" role="list">
        {results.map((result) => (
          <li key={`${result.type}-${result.id}`} className="list-none">
            <ResultItem result={result} onSelectResult={onSelectResult} />
          </li>
        ))}
      </ul>

      <div className="flex justify-center items-center space-x-4 mt-6">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-gray-300">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-4 py-2 bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};
