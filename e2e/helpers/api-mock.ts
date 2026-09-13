import { Page, Route } from '@playwright/test';
import {
  sampleGenres,
  sampleSearchResults,
  sampleAutocompleteResults,
  sampleTitleDetails,
  sampleProviders,
  emptySearchResults,
  errorResponse,
} from './test-data';

/**
 * API mocking utilities for Playwright tests.
 * Handlers registered later take precedence, so tests can override the defaults.
 */

export interface MockOptions {
  delay?: number;
  status?: number;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const wait = (delay?: number) =>
  delay ? new Promise((resolve) => setTimeout(resolve, delay)) : Promise.resolve();

/**
 * Mock the genres API endpoint
 */
export async function mockGenres(page: Page, options: MockOptions = {}): Promise<void> {
  await page.route('**/api/genres', async (route: Route) => {
    await wait(options.delay);
    await json(route, { movie: sampleGenres, tv: sampleGenres }, options.status);
  });
}

/**
 * Mock the search API endpoint (browse, search and autocomplete).
 * Queries containing "nonexistent" return no results.
 */
export async function mockSearch(
  page: Page,
  results: typeof sampleSearchResults = sampleSearchResults,
  options: MockOptions & { totalPages?: number } = {}
): Promise<void> {
  await page.route('**/api/search*', async (route: Route) => {
    const url = new URL(route.request().url());
    const mode = url.searchParams.get('mode') || 'full';
    const query = url.searchParams.get('query') || '';
    const requestedPage = parseInt(url.searchParams.get('page') || '1', 10);
    await wait(options.delay);

    if (query.toLowerCase().includes('nonexistent')) {
      await json(route, { page: 1, totalPages: 0, totalResults: 0, results: [] });
      return;
    }

    const pageResults = mode === 'autocomplete' ? sampleAutocompleteResults : results;
    await json(
      route,
      {
        page: requestedPage,
        totalPages: options.totalPages ?? 1,
        totalResults: pageResults.length,
        results: pageResults,
      },
      options.status
    );
  });
}

/**
 * Mock search API with empty results
 */
export async function mockEmptySearch(page: Page, options: MockOptions = {}): Promise<void> {
  await mockSearch(page, emptySearchResults, options);
}

/**
 * Mock search API with error
 */
export async function mockSearchError(page: Page, status: number = 500): Promise<void> {
  await page.route('**/api/search*', async (route: Route) => {
    const mode = new URL(route.request().url()).searchParams.get('mode');
    if (mode === 'autocomplete') {
      await route.fallback();
      return;
    }
    await json(route, errorResponse, status);
  });
}

/**
 * Mock the title details API endpoint. The id and type follow the request.
 */
export async function mockTitleDetails(
  page: Page,
  details: typeof sampleTitleDetails = sampleTitleDetails,
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/title/**', async (route: Route) => {
    const match = route
      .request()
      .url()
      .match(/\/api\/title\/(movie|tv)\/(\d+)/);
    await wait(options.delay);

    if (!match) {
      await json(route, { error: 'Invalid URL' }, 400);
      return;
    }

    const [, type, id] = match;
    await json(
      route,
      { ...details, id: parseInt(id, 10), type: type as 'movie' | 'tv' },
      options.status
    );
  });
}

/**
 * Mock title details API with error
 */
export async function mockTitleDetailsError(page: Page, status: number = 500): Promise<void> {
  await page.route('**/api/title/**', async (route: Route) => {
    await json(route, errorResponse, status);
  });
}

/**
 * Mock the watch providers API endpoint
 */
export async function mockProviders(page: Page, status = 200): Promise<void> {
  await page.route('**/api/providers*', async (route: Route) => {
    await json(route, status === 200 ? { providers: sampleProviders } : errorResponse, status);
  });
}

// Deterministic 44x66 placeholder so visual tests never race real image loads
const POSTER_PLACEHOLDER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACwAAABCCAIAAACjGKN8AAAAU0lEQVR4nO3OMRWAMBBAsStyWNjrXxjTf5XQJVGQ9X57bntuB2YkDolIRCISkYhEJCIRiUhEIhKRiEQkIhGJSEQiEpGIRCQiEYlIRCISkYhEJPIDqkoBF7HHE7QAAAAASUVORK5CYII=',
  'base64'
);

/**
 * Mock poster, logo and flag images (direct or via the Next.js image optimizer)
 * with a deterministic placeholder, keeping tests independent of the network.
 */
export async function mockImages(page: Page): Promise<void> {
  const fulfill = (route: Route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: POSTER_PLACEHOLDER });
  await page.route('**/image.tmdb.org/**', fulfill);
  await page.route('**/flagcdn.com/**', fulfill);
  await page.route('**/_next/image**', fulfill);
}

/**
 * Remove all API route handlers
 */
export async function removeAllMocks(page: Page): Promise<void> {
  await page.unroute('**/api/**');
}

/**
 * Setup all default mocks
 */
export async function setupDefaultMocks(page: Page): Promise<void> {
  await mockImages(page);
  await mockGenres(page);
  await mockSearch(page);
  await mockTitleDetails(page);
  await mockProviders(page);
}
