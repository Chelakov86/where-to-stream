'use client';

import React from 'react';
import ServicesDialog from '@/app/components/ServicesDialog';
import { Button } from '@/app/components/ui/button';
import { useActiveCountry } from '@/app/hooks/usePreferences';

/** Keep the trigger mounted after selection so dialog focus returns to its opener. */
export default function ServiceFilterGuidance({
  hasServices,
  id,
}: {
  hasServices: boolean;
  id: string;
}) {
  const { country, setCountry } = useActiveCountry();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {!hasServices && <p id={id}>Select your streaming services to use this filter.</p>}
      <ServicesDialog
        country={country}
        onCountryChange={(code) => {
          setCountry(code);
          const url = new URL(window.location.href);
          if (url.searchParams.has('country')) {
            url.searchParams.set('country', code);
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
          }
        }}
        trigger={
          <Button variant="outline" size="sm" className="min-h-11">
            Choose services
          </Button>
        }
      />
    </div>
  );
}
