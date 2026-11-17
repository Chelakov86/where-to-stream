'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, SearchX, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import RequestError from '@/app/components/RequestError';
import EmptyState from '@/app/components/EmptyState';
import FiltersBar from '@/app/components/FiltersBar';
import PageContainer from '@/app/components/PageContainer';
import SearchBox from '@/app/components/SearchBox';
import { TitleGridSkeleton } from '@/app/components/Skeleton';
import TitleCard from '@/app/components/TitleCard';
import { useApiResource } from '@/app/hooks/useApiResource';
import { useGenres } from '@/app/hooks/useGenres';
import { useActiveCountry, useMyServices } from '@/app/hooks/usePreferences';
import { SearchResponse, serializeSearchRequest } from '@/app/searchContract';
import { saveSearchPosition, restoreSearchPosition } from '@/app/utils/searchPosition';
import { getCountryName } from '@/app/utils/countries';
import {
  SearchPageState,
  parseSearchPageState,
  serializeSearchPageState,
  toSearchRequestParams,
} from '@/app/utils/searchPageState';

/**
 * Search page: hero search box, then popular titles (no query) or search results
 * as a poster grid with filters. All state lives in the URL.
 */
const SearchView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseSearchPageState(searchParams), [searchParams]);
  const { country, ready: countryReady } = useActiveCountry();
  const { services, ready: servicesReady } = useMyServices();
  const {
    genres,
    isLoading: genresLoading,
    error: genresError,
    reload: reloadGenres,
  } = useGenres();

  const navigate = useCallback(
    (next: SearchPageState, history: 'replace' | 'push' = 'replace') => {
      const query = serializeSearchPageState(next, searchParams?.get('country'));
      const href = query ? `/?${query}` : '/';
      if (history === 'push') {
        router.push(href);
      } else {
        router.replace(href, { scroll: false });
      }
    },
    [router, searchParams]
  );

  const update = useCallback(
    (patch: Partial<SearchPageState>) => navigate({ ...state, ...patch, page: 1 }),
    [navigate, state]
  );
  const previousServiceCount = useRef(services.length);
  useEffect(() => {
    if (previousServiceCount.current > 0 && services.length === 0 && state.mine) {
      navigate({ ...state, mine: false });
    }
    previousServiceCount.current = services.length;
  }, [services.length, state, navigate]);

  const setQuery = useCallback(
    (query: string) => {
      const next = serializeSearchPageState(
        { ...state, query, page: 1 },
        searchParams?.get('country')
      );
      // Next.js syncs native history updates with useSearchParams. Updating
      // synchronously avoids racing a pending search navigation against a title selection.
      window.history.replaceState(null, '', next ? `/?${next}` : '/');
    },
    [state, searchParams]
  );

  const apiUrl =
    countryReady && servicesReady
      ? `/api/search?${serializeSearchRequest(toSearchRequestParams(state, country, services), {
          page: state.page,
        })}`
      : null;
  const { data, error, failure, isLoading, reload } = useApiResource<SearchResponse>(apiUrl);

  const returnTo = `/?${serializeSearchPageState(state, country)}`;
  const rememberPosition = () => saveSearchPosition(returnTo);
  useEffect(() => {
    if (!data) return;
    const frame = requestAnimationFrame(() => restoreSearchPosition(returnTo));
    return () => cancelAnimationFrame(frame);
  }, [data, returnTo]);

  const currentPage = data?.page ?? state.page;
  const browsing = state.query === '';
  const countryName = getCountryName(country);
  const onlyMine = state.mine && services.length > 0;
  const heading = browsing
    ? onlyMine
      ? `Popular on your services in ${countryName}`
      : `Popular in ${countryName}`
    : `Results for “${state.query}”`;

  return (
    <main className="pb-20">
      <section className="border-b border-border bg-card/30 py-10 sm:py-14">
        <PageContainer className="max-w-3xl text-center">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Where can I stream it in {countryName}?
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Search any film or series and see the exact services that carry it — subscription, free,
            rent or buy — country by country.
          </p>
          <div className="mt-7">
            <SearchBox
              value={state.query}
              onChange={setQuery}
              country={country}
              returnTo={returnTo}
              onOpen={rememberPosition}
            />
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        <section className="mt-8" aria-labelledby="results-heading">
          <h2
            id="results-heading"
            className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"
          >
            {browsing && <Sparkles className="size-4 text-primary" aria-hidden="true" />}
            {heading}
          </h2>

          <FiltersBar
            state={state}
            genres={genres}
            genresLoading={genresLoading}
            genresError={genresError}
            onReloadGenres={reloadGenres}
            hasServices={services.length > 0}
            onChange={update}
          />

          <div className="mt-6" aria-live="polite" aria-busy={isLoading}>
            {error ? (
              <RequestError
                failure={failure}
                message={error}
                reload={reload}
                fallbackTitle="We couldn't reach the catalogue."
              />
            ) : !data ? (
              <TitleGridSkeleton />
            ) : data.results.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={
                  data.resultsTruncated
                    ? 'No matches in the inspected results'
                    : data.paginationScope === 'upstream' && data.totalPages > 1
                      ? 'No matches on this page'
                      : browsing
                        ? 'Nothing matched those filters'
                        : 'No titles found'
                }
                description={
                  data.resultsTruncated
                    ? 'This search is incomplete. Use a more specific title query to inspect more relevant matches.'
                    : data.paginationScope === 'upstream' && data.totalPages > 1
                      ? 'Try another page, or loosen the year, rating and genre filters.'
                      : 'Try a different spelling, or loosen the year, rating and genre filters.'
                }
                action={
                  <Button
                    variant="outline"
                    onClick={() =>
                      update({
                        type: 'all',
                        genreIds: [],
                        yearFrom: undefined,
                        yearTo: undefined,
                        minRating: 0,
                        language: '',
                        mine: false,
                      })
                    }
                  >
                    <Compass aria-hidden="true" /> Reset filters
                  </Button>
                }
              />
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {data.results.map((title) => (
                  <li key={`${title.type}-${title.id}`}>
                    <TitleCard
                      title={title}
                      country={country}
                      returnTo={returnTo}
                      onOpen={rememberPosition}
                    />
                  </li>
                ))}
              </ul>
            )}
            {!error && data?.resultsTruncated && (
              <p role="status" className="mt-6 text-center text-sm text-muted-foreground">
                This search is incomplete. Results and page counts cover only the titles inspected.
                Use a more specific title query to narrow the search.
              </p>
            )}
            {!error && data?.paginationScope === 'upstream' && data.totalPages > 1 && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Filters apply to each TMDB results page. Page counts include titles excluded by your
                filters; other pages may contain more matches.
              </p>
            )}
            {!error && data && data.totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => navigate({ ...state, page: currentPage - 1 }, 'push')}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage >= data.totalPages}
                  onClick={() => navigate({ ...state, page: currentPage + 1 }, 'push')}
                >
                  Next
                </Button>
              </nav>
            )}
          </div>
        </section>
      </PageContainer>
    </main>
  );
};

export default SearchView;
