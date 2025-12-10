import { Page, Route } from '@playwright/test';
import {
  sampleGenres,
  sampleSearchResults,
  sampleAutocompleteResults,
  sampleTitleDetails,
  emptySearchResults,
  errorResponse,
} from './test-data';

/**
 * API mocking utilities for Playwright tests
 */

export interface MockOptions {
  delay?: number;
  status?: number;
}

/**
 * Mock the genres API endpoint
 */
export async function mockGenres(page: Page, options: MockOptions = {}): Promise<void> {
  await page.route('**/api/genres', async (route: Route) => {
    await route.fulfill({
      status: options.status || 200,
      contentType: 'application/json',
      body: JSON.stringify({
        movie: sampleGenres,
        tv: sampleGenres,
      }),
      ...(options.delay && { delay: options.delay }),
    });
  });
}

/**
 * Mock the search API endpoint
 */
export async function mockSearch(
  page: Page,
  results: typeof sampleSearchResults = sampleSearchResults,
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/search*', async (route: Route) => {
    const url = new URL(route.request().url());
    const mode = url.searchParams.get('mode') || 'full';
    const query = url.searchParams.get('query') || '';

    // Return empty results for specific queries
    if (query.toLowerCase().includes('nonexistent')) {
      await route.fulfill({
        status: options.status || 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 0,
          totalResults: 0,
          results: [],
        }),
        ...(options.delay && { delay: options.delay }),
      });
      return;
    }

    // Return autocomplete results for autocomplete mode
    if (mode === 'autocomplete') {
      await route.fulfill({
        status: options.status || 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          totalPages: 1,
          totalResults: sampleAutocompleteResults.length,
          results: sampleAutocompleteResults,
        }),
        ...(options.delay && { delay: options.delay }),
      });
      return;
    }

    // Return full search results
    await route.fulfill({
      status: options.status || 200,
      contentType: 'application/json',
      body: JSON.stringify({
        page: 1,
        totalPages: 1,
        totalResults: results.length,
        results: results,
      }),
      ...(options.delay && { delay: options.delay }),
    });
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
  await page.route('**/api/search**', async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(errorResponse),
    });
  });
}

/**
 * Mock the title details API endpoint
 */
export async function mockTitleDetails(
  page: Page,
  details: typeof sampleTitleDetails = sampleTitleDetails,
  options: MockOptions = {}
): Promise<void> {
  await page.route('**/api/title/**', async (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/api\/title\/(movie|tv)\/(\d+)/);

    if (!match) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid URL' }),
      });
      return;
    }

    const [, type, id] = match;

    // Return error for specific IDs
    if (id === '99999') {
      await route.fulfill({
        status: options.status || 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
        ...(options.delay && { delay: options.delay }),
      });
      return;
    }

    // Return mocked details
    await route.fulfill({
      status: options.status || 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...details,
        id: parseInt(id, 10),
        type: type as 'movie' | 'tv',
      }),
      ...(options.delay && { delay: options.delay }),
    });
  });
}

/**
 * Mock title details API with error
 */
export async function mockTitleDetailsError(page: Page, status: number = 500): Promise<void> {
  await page.route('**/api/title/**', async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(errorResponse),
    });
  });
}

/**
 * Mock network failure
 */
export async function mockNetworkFailure(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    await route.abort('failed');
  });
}

/**
 * Remove all route handlers
 */
export async function removeAllMocks(page: Page): Promise<void> {
  await page.unroute('**/api/**');
}

/**
 * Setup all default mocks
 */
export async function setupDefaultMocks(page: Page): Promise<void> {
  await mockGenres(page);
  await mockSearch(page);
  await mockTitleDetails(page);
}
