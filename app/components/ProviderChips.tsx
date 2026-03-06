'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';
import { WatchProvider } from '@/app/types';

// Well-known provider IDs shown in "Popular" section first
const POPULAR_PROVIDER_IDS = new Set([8, 9, 337, 15, 350, 384, 386, 531, 283, 188]);
// Netflix=8, Prime Video=9, Disney+=337, Hulu=15, Apple TV+=350,
// Max=384, Peacock=386, Paramount+=531, Crunchyroll=283, YouTube Premium=188

interface ProviderChipsProps {
  providers: WatchProvider[];
  selectedProviders: number[];
  onChange: (ids: number[]) => void;
}

const ProviderChips: React.FC<ProviderChipsProps> = ({
  providers,
  selectedProviders,
  onChange,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter((p) => p.provider_name.toLowerCase().includes(q));
  }, [providers, search]);

  const popular = useMemo(
    () => filtered.filter((p) => POPULAR_PROVIDER_IDS.has(p.provider_id)),
    [filtered]
  );
  const others = useMemo(
    () => filtered.filter((p) => !POPULAR_PROVIDER_IDS.has(p.provider_id)),
    [filtered]
  );

  const renderChip = useCallback(
    (provider: WatchProvider) => {
      const logoUrl = buildTmdbImageUrl(provider.logo_path, 'w92');
      const isSelected = selectedProviders.includes(provider.provider_id);
      return (
        <button
          key={provider.provider_id}
          type="button"
          title={provider.provider_name}
          aria-label={`${isSelected ? 'Remove' : 'Add'} ${provider.provider_name} filter`}
          aria-pressed={isSelected}
          onClick={() => {
            if (selectedProviders.includes(provider.provider_id)) {
              onChange(selectedProviders.filter((x) => x !== provider.provider_id));
            } else {
              onChange([...selectedProviders, provider.provider_id]);
            }
          }}
          className={`
          w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 transition-all
          focus:outline-none focus:ring-2 focus:ring-accent-primary/60
          ${
            isSelected
              ? 'ring-2 ring-accent-primary shadow-[0_0_8px_rgba(0,212,255,0.3)]'
              : 'ring-1 ring-gray-600 opacity-70 hover:opacity-100 hover:ring-gray-500'
          }
        `}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-400">
              ?
            </div>
          )}
        </button>
      );
    },
    [selectedProviders, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search providers..."
        className="w-full p-2 text-sm bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-colors"
        aria-label="Search streaming providers"
      />

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400">No providers match &quot;{search}&quot;</p>
      )}

      {/* Popular section */}
      {popular.length > 0 && (
        <div>
          {!search && (
            <span className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              Popular
            </span>
          )}
          <div className="flex flex-wrap gap-2">{popular.map(renderChip)}</div>
        </div>
      )}

      {/* All others */}
      {others.length > 0 && (
        <div>
          {!search && popular.length > 0 && (
            <span className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              All providers
            </span>
          )}
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {others.map(renderChip)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderChips;
