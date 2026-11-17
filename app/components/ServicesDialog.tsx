'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Tv, X } from 'lucide-react';
import { WatchProvider } from '@/app/types';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import PreferenceWarning from '@/app/components/PreferenceWarning';
import CountryPicker from '@/app/components/CountryPicker';
import { Skeleton } from '@/app/components/Skeleton';
import { useMyServices } from '@/app/hooks/usePreferences';
import { useProviders } from '@/app/hooks/useProviders';
import { getCountryName } from '@/app/utils/countries';
import { cn } from '@/app/utils/cn';

interface ServicesDialogProps {
  trigger?: React.ReactElement;
  country: string;
  onCountryChange: (code: string) => void;
}

/**
 * Dialog for picking the streaming services the user subscribes to.
 * Providers are only fetched once the dialog is opened.
 */
const ServicesDialog: React.FC<ServicesDialogProps> = ({ country, onCountryChange, trigger }) => {
  const [open, setOpen] = useState(false);
  const { services, toggleService, clearServices } = useMyServices();
  const { providers, isLoading, error } = useProviders(open ? country : undefined);

  const [query, setQuery] = useState('');
  const [knownProviders, setKnownProviders] = useState<Record<number, WatchProvider>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const selectedId = useId();

  // Keep catalogue details through country changes and closing/reopening the dialog.
  // Older ID-only preferences remain usable even before we encounter their provider.
  useEffect(() => {
    if (providers.length === 0) return;
    setKnownProviders((known) => ({
      ...known,
      ...Object.fromEntries(providers.map((provider) => [provider.id, provider])),
    }));
  }, [providers]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = providers.filter((provider) =>
    provider.name.toLocaleLowerCase().includes(normalizedQuery)
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" aria-label={`My services (${services.length} selected)`}>
            <Tv className="text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">My services</span>
            {services.length > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {services.length}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="font-display">Your streaming services</DialogTitle>
          <DialogDescription>
            Pick what you already pay for in {getCountryName(country)}. Titles you can watch right
            now get highlighted, and you can filter results down to just those.
          </DialogDescription>
        </DialogHeader>

        <PreferenceWarning />

        <div className="flex items-center justify-between gap-2 text-sm">
          <span>Change country</span>
          <CountryPicker country={country} onChange={onCountryChange} />
        </div>

        {services.length > 0 && (
          <section aria-labelledby={selectedId} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 id={selectedId} className="text-sm font-semibold">
                Selected services ({services.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  searchRef.current?.focus();
                  clearServices();
                }}
              >
                Clear all
              </Button>
            </div>
            <ul className="flex max-h-28 flex-wrap gap-2 overflow-y-auto p-1">
              {services.map((id) => {
                const provider = knownProviders[id];
                const name = provider?.name ?? `Unavailable service (ID ${id})`;
                return (
                  <li key={id} className="max-w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Remove ${name}`}
                      onClick={() => {
                        searchRef.current?.focus();
                        toggleService(id);
                      }}
                      className="h-auto min-h-11 max-w-full whitespace-normal text-left"
                    >
                      {provider?.logoUrl && (
                        <Image
                          src={provider.logoUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="size-6 rounded"
                        />
                      )}
                      <span className="min-w-0 break-words">{name}</span>
                      <X className="shrink-0" aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="space-y-2">
          <label htmlFor={searchId} className="text-sm font-medium">
            Search services
          </label>
          <Input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all services…"
          />
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="status"
            aria-label="Loading providers"
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="alert">
            Couldn&apos;t load providers. Close the dialog and try again.
          </p>
        ) : providers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            No streaming services are listed in {getCountryName(country)}. Try changing the country
            above. Your selected services are kept.
          </p>
        ) : (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              {matches.length === 0
                ? 'No services match your search. Try another name.'
                : `${matches.length} of ${providers.length} services`}
            </p>
            <ul
              aria-label="Available services"
              className="-mx-1 grid max-h-[35dvh] grid-cols-2 gap-2 overflow-y-auto px-1 sm:grid-cols-3"
            >
              {matches.map((provider) => {
                const active = services.includes(provider.id);
                return (
                  <li key={provider.id}>
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={active}
                      onClick={() => toggleService(provider.id)}
                      className={cn(
                        'h-auto min-h-14 w-full justify-start gap-2 whitespace-normal p-2 text-left text-sm shadow-none',
                        active
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {provider.logoUrl ? (
                        <Image
                          src={provider.logoUrl}
                          alt=""
                          width={36}
                          height={36}
                          className="size-9 shrink-0 rounded-lg"
                        />
                      ) : (
                        <span className="size-9 shrink-0 rounded-lg bg-muted" />
                      )}
                      <span className="line-clamp-2 flex-1 leading-tight">{provider.name}</span>
                      {active && <Check className="text-primary" aria-hidden="true" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServicesDialog;
