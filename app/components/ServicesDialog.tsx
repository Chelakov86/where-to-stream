'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check, Tv } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/Skeleton';
import { useMyServices } from '@/app/hooks/usePreferences';
import { useProviders } from '@/app/hooks/useProviders';
import { getCountryName } from '@/app/utils/countries';
import { buildTmdbImageUrl } from '@/app/utils/tmdb';
import { cn } from '@/app/utils/cn';

interface ServicesDialogProps {
  country: string;
}

/** Providers beyond this display priority are rarely relevant; keep the grid scannable. */
const MAX_PROVIDERS = 60;

/**
 * Dialog for picking the streaming services the user subscribes to.
 * Providers are only fetched once the dialog is opened.
 */
const ServicesDialog: React.FC<ServicesDialogProps> = ({ country }) => {
  const [open, setOpen] = useState(false);
  const { services, toggleService, clearServices } = useMyServices();
  const { providers, isLoading, error } = useProviders(open ? country : undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label={`My services (${services.length} selected)`}>
          <Tv className="text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">My services</span>
          {services.length > 0 && (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {services.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="font-display">Your streaming services</DialogTitle>
          <DialogDescription>
            Pick what you already pay for in {getCountryName(country)}. Titles you can watch right
            now get highlighted, and you can filter results down to just those.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="alert">
            Couldn&apos;t load providers. Close the dialog and try again.
          </p>
        ) : isLoading || providers.length === 0 ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="status"
            aria-label="Loading providers"
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <ul className="-mx-1 grid max-h-[45vh] grid-cols-2 gap-2 overflow-y-auto px-1 sm:grid-cols-3">
              {providers.slice(0, MAX_PROVIDERS).map((provider) => {
                const active = services.includes(provider.provider_id);
                const logoUrl = buildTmdbImageUrl(provider.logo_path, 'w92');
                return (
                  <li key={provider.provider_id}>
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={active}
                      onClick={() => toggleService(provider.provider_id)}
                      className={cn(
                        'h-auto min-h-14 w-full justify-start gap-2 whitespace-normal p-2 text-left text-sm shadow-none',
                        active
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt=""
                          width={36}
                          height={36}
                          className="size-9 shrink-0 rounded-lg"
                        />
                      ) : (
                        <span className="size-9 shrink-0 rounded-lg bg-muted" />
                      )}
                      <span className="line-clamp-2 flex-1 leading-tight">
                        {provider.provider_name}
                      </span>
                      {active && <Check className="text-primary" aria-hidden="true" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {services.length > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearServices}>
                  Clear all
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServicesDialog;
