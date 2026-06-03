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
    <aside className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-text shadow-[0_24px_70px_rgba(0,0,0,0.22)] lg:mt-[8.25rem]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Search History</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
            Recently viewed
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black transition hover:border-white/20 hover:bg-white/[0.09]"
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
                className="rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-text-secondary transition hover:bg-red-500/[0.12] hover:text-red-100"
                aria-label="Clear all search history"
              >
                Clear All
              </button>
            </div>
          )}
          {history.length === 0 ? (
            <p className="py-5 text-center text-sm leading-6 text-text-secondary">
              No viewed titles yet. Titles you view will appear here.
            </p>
          ) : (
            <>
              {displayHistory.map((item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/[0.18] p-2 transition hover:border-white/[0.16] hover:bg-white/[0.06]"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTitle(item.id, item.type)}
                    className="min-w-0 flex-1 text-left text-sm transition hover:text-accent-primary"
                    aria-label={`View ${formatTitle(item)}`}
                  >
                    <div className="truncate font-black">{formatTitle(item)}</div>
                    <div className="mt-0.5 text-xs font-semibold text-text-secondary">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="ml-2 rounded-md bg-white/[0.08] px-2 py-1 text-xs font-black opacity-0 transition hover:bg-red-500/70 group-hover:opacity-100 focus:opacity-100"
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
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-2 text-sm font-black transition hover:bg-white/[0.08]"
                >
                  Show {history.length - DISPLAY_LIMIT} more
                </button>
              )}

              {showAll && hasMore && (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] p-2 text-sm font-black transition hover:bg-white/[0.08]"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
};

export default SearchHistory;
