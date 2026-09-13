'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Bookmark, BookmarkCheck, Play, Star } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import AvailabilityPanel from '@/app/components/AvailabilityPanel';
import PageContainer from '@/app/components/PageContainer';
import { Skeleton } from '@/app/components/Skeleton';
import { useApiResource } from '@/app/hooks/useApiResource';
import { useActiveCountry, useMyServices, useSavedTitles } from '@/app/hooks/usePreferences';
import { useSearchHistory } from '@/app/hooks/useSearchHistory';
import { MediaType, TitleDetails } from '@/app/types';
import { languageName, runtimeLabel } from '@/app/utils/format';

interface TitleViewProps {
  type: MediaType;
  id: number;
}

const BackToSearch: React.FC = () => (
  <Link
    href="/"
    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft className="size-4" aria-hidden="true" /> Back to search
  </Link>
);

/**
 * Title detail page: backdrop hero with metadata and actions, availability for
 * the user's country, and the cast.
 */
const TitleView: React.FC<TitleViewProps> = ({ type, id }) => {
  const { country } = useActiveCountry();
  const { services } = useMyServices();
  const { isSaved, toggleSaved } = useSavedTitles();
  const { addToHistory } = useSearchHistory();
  const { data: title, error, reload } = useApiResource<TitleDetails>(`/api/title/${type}/${id}`);

  useEffect(() => {
    if (title) {
      addToHistory(title.id, title.type, title.title, title.year);
    }
    // Record each title once per load, not on every history change
  }, [title?.id, title?.type]);

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-xl font-semibold">We couldn&apos;t load this title</h1>
        <p className="mt-2 text-sm text-muted-foreground" role="alert">
          {error}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reload}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to search</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!title) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10" aria-busy="true">
        <span className="sr-only" role="status">
          Loading title
        </span>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </main>
    );
  }

  const saved = isSaved(title.type, title.id);
  const runtime = runtimeLabel(title.runtime);

  return (
    <main className="pb-20">
      <article>
        <div className="relative">
          {title.backdropUrl && (
            <div className="absolute inset-0 h-72 overflow-hidden" aria-hidden="true">
              <Image
                src={title.backdropUrl}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />
            </div>
          )}
          <PageContainer className="relative max-w-5xl pb-6 pt-6">
            <BackToSearch />

            <div className="mt-5 flex flex-col gap-6 sm:flex-row">
              <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-lg sm:w-48">
                {title.posterUrl && (
                  <Image
                    src={title.posterUrl}
                    alt={`${title.title} poster`}
                    fill
                    priority
                    sizes="12rem"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title.title}</h1>
                {title.tagline && (
                  <p className="mt-1 text-sm italic text-muted-foreground">{title.tagline}</p>
                )}

                <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <li>{title.type === 'tv' ? 'Series' : 'Film'}</li>
                  <li>{title.year ?? '—'}</li>
                  {runtime && <li>{runtime}</li>}
                  {title.seasons !== undefined && title.seasons > 0 && (
                    <li>
                      {title.seasons} season{title.seasons > 1 ? 's' : ''}
                      {title.episodes ? ` · ${title.episodes} episodes` : ''}
                    </li>
                  )}
                  {title.language && <li>{languageName(title.language)}</li>}
                  {title.rating !== undefined && title.rating > 0 && (
                    <li className="inline-flex items-center gap-1 text-foreground">
                      <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
                      <span className="sr-only">Rating</span>
                      {title.rating.toFixed(1)}
                      {title.voteCount !== undefined && (
                        <span className="text-muted-foreground">
                          ({title.voteCount.toLocaleString('en')} votes)
                        </span>
                      )}
                    </li>
                  )}
                </ul>

                {title.genres.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Genres">
                    {title.genres.map((genre) => (
                      <li
                        key={genre.id}
                        className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {genre.name}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/90">
                  {title.overview || 'No synopsis available for this title yet.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant={saved ? 'secondary' : 'default'}
                    aria-pressed={saved}
                    onClick={() =>
                      toggleSaved({
                        id: title.id,
                        type: title.type,
                        title: title.title,
                        year: title.year,
                        posterUrl: title.posterUrl,
                      })
                    }
                  >
                    {saved ? (
                      <>
                        <BookmarkCheck aria-hidden="true" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark aria-hidden="true" /> Save title
                      </>
                    )}
                  </Button>
                  {title.trailerUrl && (
                    <Button variant="outline" asChild>
                      <a href={title.trailerUrl} target="_blank" rel="noopener noreferrer">
                        <Play aria-hidden="true" /> Watch trailer
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </PageContainer>
        </div>

        <PageContainer className="max-w-5xl space-y-8">
          <AvailabilityPanel title={title} country={country} services={services} />

          {title.cast.length > 0 && (
            <section aria-labelledby="cast-heading">
              <h2 id="cast-heading" className="font-display text-lg font-semibold">
                Cast
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {title.cast.map((member) => (
                  <li
                    key={`${member.name}-${member.character}`}
                    className="rounded-lg border border-border bg-card p-2 shadow-sm"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                      {member.profileUrl && (
                        <Image
                          src={member.profileUrl}
                          alt=""
                          fill
                          sizes="10rem"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.character}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </PageContainer>
      </article>
    </main>
  );
};

export default TitleView;
