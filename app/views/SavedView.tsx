'use client';

import React from 'react';
import Link from 'next/link';
import { BookmarkX, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import EmptyState from '@/app/components/EmptyState';
import PageContainer from '@/app/components/PageContainer';
import { TitleGridSkeleton } from '@/app/components/Skeleton';
import TitleCard from '@/app/components/TitleCard';
import { useActiveCountry, useSavedTitles } from '@/app/hooks/usePreferences';

/**
 * Watchlist page: titles saved on this device, with remove actions.
 */
const SavedView: React.FC = () => {
  const { country } = useActiveCountry();
  const { saved, toggleSaved, ready } = useSavedTitles();

  return (
    <main>
      <PageContainer className="pb-20 pt-8">
        <h1 className="font-display text-2xl font-semibold">Saved titles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kept locally on this device — no account needed.
        </p>

        {!ready ? (
          <div className="mt-6">
            <TitleGridSkeleton count={5} />
          </div>
        ) : saved.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={BookmarkX}
            title="Nothing saved yet"
            description="Save a film or series from its page and it will show up here."
            action={
              <Button asChild>
                <Link href="/">Start searching</Link>
              </Button>
            }
          />
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {saved.map((title) => (
              <li key={`${title.type}-${title.id}`} className="relative">
                <TitleCard title={title} country={country} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => toggleSaved(title)}
                  aria-label={`Remove ${title.title} from saved`}
                  className="absolute right-1.5 top-1.5 size-9 bg-background/90 text-muted-foreground backdrop-blur hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </main>
  );
};

export default SavedView;
