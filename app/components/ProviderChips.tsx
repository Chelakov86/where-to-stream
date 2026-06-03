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
          h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-lg shadow-black/20 transition-all
          focus:outline-none focus:ring-2 focus:ring-accent-primary/70
          ${
            isSelected
              ? 'scale-105 ring-2 ring-accent-primary shadow-[0_0_24px_rgba(246,185,75,0.22)]'
              : 'ring-1 ring-white/[0.14] opacity-70 hover:-translate-y-0.5 hover:opacity-100 hover:ring-white/30'
          }
        `}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/[0.08] text-xs font-black text-text-secondary">
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
        className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-text outline-none transition placeholder:text-text-secondary/60 focus:border-accent-primary/70 focus:ring-2 focus:ring-accent-primary/20"
        aria-label="Search streaming providers"
      />

      {filtered.length === 0 && (
        <p className="text-sm text-text-secondary">No providers match &quot;{search}&quot;</p>
      )}

      {/* Popular section */}
      {popular.length > 0 && (
        <div>
          {!search && (
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-text-secondary">
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
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-text-secondary">
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
