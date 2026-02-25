'use client';

import React, { useState } from 'react';
import { SearchHistoryItem } from '@/app/types';

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelectTitle: (id: number, type: 'movie' | 'tv') => void;
  onRemoveItem: (index: number) => void;
  onClearHistory: () => void;
}

/**
 * Formats a timestamp into a human-readable relative time string
 */
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // For older items, show formatted date
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Formats a viewed title into a readable string
 */
function formatTitle(item: SearchHistoryItem): string {
  const parts: string[] = [item.title];

  if (item.year) {
    parts.push(`(${item.year})`);
  }

  parts.push(`[${item.type === 'movie' ? 'Movie' : 'TV Show'}]`);

  return parts.join(' ');
}

const DISPLAY_LIMIT = 10;

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelectTitle,
  onRemoveItem,
  onClearHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayHistory = showAll ? history : history.slice(0, DISPLAY_LIMIT);
  const hasMore = history.length > DISPLAY_LIMIT;

  const handleClearHistory = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all viewed titles from your history? This action cannot be undone.'
      )
    ) {
      onClearHistory();
    }
  };

  return (
    <div className="mt-4 p-4 glass-panel rounded-xl text-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Search History</h2>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1 text-sm bg-muted-violet/40 hover:bg-muted-violet/60 border border-golden-bronze/30 rounded-lg font-medium flex items-center gap-1 transition-colors"
          aria-expanded={isExpanded}
          aria-controls="search-history-list"
        >
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
          <span className="text-lg">{isExpanded ? '−' : '+'}</span>
        </button>
      </div>

      {isExpanded && (
        <div id="search-history-list" className="space-y-2">
          {history.length > 0 && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3 py-1 text-sm bg-muted-violet/40 hover:bg-red-600/80 border border-golden-bronze/30 rounded-lg font-medium transition-colors"
                aria-label="Clear all search history"
              >
                Clear All
              </button>
            </div>
          )}
          {history.length === 0 ? (
            <p className="text-sm text-cream-text/60 py-4 text-center">
              No viewed titles yet. Titles you view will appear here.
            </p>
          ) : (
            <>
              {displayHistory.map((item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  className="flex items-center justify-between p-2 bg-muted-violet/40 hover:bg-muted-violet/60 border border-golden-bronze/20 rounded-lg transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTitle(item.id, item.type)}
                    className="flex-1 text-left text-sm hover:text-primary-gold transition-colors"
                    aria-label={`View ${formatTitle(item)}`}
                  >
                    <div className="font-medium">{formatTitle(item)}</div>
                    <div className="text-xs text-cream-text/60 mt-0.5">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="ml-2 px-2 py-1 text-xs bg-muted-violet/60 hover:bg-red-600/80 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label={`Remove ${formatTitle(item)}`}
                  >
                    ×
                  </button>
                </div>
              ))}

              {hasMore && !showAll && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full p-2 text-sm bg-muted-violet/40 hover:bg-muted-violet/60 border border-golden-bronze/30 rounded-lg font-medium transition-colors"
                >
                  Show {history.length - DISPLAY_LIMIT} more
                </button>
              )}

              {showAll && hasMore && (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="w-full p-2 text-sm bg-muted-violet/40 hover:bg-muted-violet/60 border border-golden-bronze/30 rounded-lg font-medium transition-colors"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchHistory;
