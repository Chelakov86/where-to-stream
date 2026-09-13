'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Clapperboard } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import CountryPicker from '@/app/components/CountryPicker';
import PageContainer from '@/app/components/PageContainer';
import ServicesDialog from '@/app/components/ServicesDialog';
import { useActiveCountry } from '@/app/hooks/usePreferences';
import { cn } from '@/app/utils/cn';

/**
 * Sticky app header: logo, saved titles, streaming services and country picker.
 */
const AppHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { country, setCountry } = useActiveCountry();

  const changeCountry = (code: string) => {
    setCountry(code);
    // A country in the URL overrides the stored one, so keep it in step
    if (searchParams?.has('country')) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('country', code);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const onSavedPage = pathname === '/saved';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <PageContainer className="flex h-16 items-center gap-2">
        <Link
          href="/"
          className="mr-auto flex items-center gap-2.5 rounded-lg font-display text-lg font-semibold"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-5" aria-hidden="true" />
          </span>
          <span>
            Where<span className="text-primary">To</span>Stream
          </span>
        </Link>

        <Button
          variant="outline"
          size="icon"
          asChild
          className={cn(onSavedPage && 'border-primary/40 text-primary')}
        >
          <Link
            href={`/saved?country=${country}`}
            aria-label="Saved titles"
            aria-current={onSavedPage ? 'page' : undefined}
          >
            <Bookmark aria-hidden="true" />
          </Link>
        </Button>
        <ServicesDialog country={country} />
        <CountryPicker country={country} onChange={changeCountry} />
      </PageContainer>
    </header>
  );
};

export default AppHeader;
