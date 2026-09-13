# Playwright E2E Test Suite

This directory contains end-to-end tests for the WhereToStream application using Playwright.

## Structure

```
e2e/
├── pages/                  # Page Object Models (POM)
│   ├── BasePage.ts         # Base class with common methods
│   ├── HomePage.ts         # Search page + app header (services, country, saved)
│   ├── TitlePage.ts        # Title detail page
│   ├── CountriesPage.ts    # Country comparison page
│   └── SavedPage.ts        # Saved titles (watchlist) page
├── fixtures/               # Custom Playwright fixtures
│   └── test-fixtures.ts
├── helpers/                # Test utilities and helpers
│   ├── api-mock.ts         # API and image mocking utilities
│   └── test-data.ts        # Test data constants
├── tests/                  # Test files
│   ├── search.e2e.spec.ts
│   ├── autocomplete.e2e.spec.ts
│   ├── filters.e2e.spec.ts
│   ├── preferences.e2e.spec.ts
│   ├── title-page.e2e.spec.ts
│   ├── saved.e2e.spec.ts
│   ├── search-history.e2e.spec.ts
│   ├── error-handling.e2e.spec.ts
│   ├── accessibility.e2e.spec.ts
│   ├── responsive.e2e.spec.ts
│   └── visual-regression.e2e.spec.ts
├── global-setup.ts         # Global setup (runs before all tests)
├── global-teardown.ts      # Global teardown (runs after all tests)
└── README.md               # This file
```

## Running Tests

```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # UI mode (interactive)
npm run test:e2e:debug     # Debug mode
npm run test:e2e:headed    # Headed mode (see browser)
npm run test:e2e:chromium  # Chromium desktop project only
npm run test:e2e:report    # View the last report
npm run test:all           # Jest + Playwright
```

## Page Object Model (POM)

We use the Page Object Model pattern to encapsulate page interactions and make tests more maintainable.

### HomePage

The search page and the app header:

- Search box: `search(query)` (waits for the query in the URL), `typeSearchQuery()`, suggestions
- Results: `titleCards`, `resultsHeading`, `emptyState`, `errorAlert`, pagination
- Filters: `selectType()`, `openFilters()`, `onlyMineSwitch`, `sortSelect`
- Header: `openServices()`, `toggleService(name)`, `chooseCountry(name)`, `savedLink`
- `nextSearchRequest()`: resolves with the next full-mode `/api/search` request, to assert parameters

### TitlePage

`gotoTitle(type, id, country?)`, `verdict`, `availabilityHeading`, `providerLink(name)`,
`saveButton`, `compareLink`, `castSection`, error state.

### CountriesPage

`gotoCountries(type, id, country?)`, `countryNames` (in display order), `card(name)`,
`pinButton(name)`, `filterInput`, `onMyServicesButton`.

### SavedPage

`gotoSaved()`, `savedCards`, `removeButton(title)`, `emptyState`.

## Test Fixtures

Custom fixtures are defined in `fixtures/test-fixtures.ts`. Every fixture installs the default
mocks and starts the user in the United States (the stored country, unless a test changes it):

- `homePage`: HomePage, already navigated to `/`
- `titlePage`, `countriesPage`, `savedPage`: page objects, not yet navigated

## API Mocking

Tests mock every API response and image so they are fast and deterministic. Utilities live in
`helpers/api-mock.ts`; handlers registered later take precedence over the defaults.

- `mockSearch(page, results?, { totalPages })`: browse, search and autocomplete (queries containing
  "nonexistent" return nothing)
- `mockEmptySearch()`, `mockSearchError(page, status)`
- `mockTitleDetails()`, `mockTitleDetailsError(page, status)`
- `mockGenres()`, `mockProviders(page, status?)`
- `mockImages()`: placeholder for TMDB posters/logos, flags and `/_next/image` requests
- `setupDefaultMocks()`: all of the above with sample data

## Writing New Tests

```typescript
import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';

test.describe('Feature Name', () => {
  test('should do something', async ({ homePage, page }) => {
    await mockSearch(page, customResults);

    await homePage.search('query');
    await homePage.waitForResults();

    await expect(homePage.titleCards).toHaveCount(customResults.length);
  });
});
```

### Best Practices

1. **Use Page Object Models** and accessible locators (roles and names) instead of CSS selectors
2. **Mock APIs**: never hit TMDB from E2E tests
3. **Assert on the URL** for search state — it is the source of truth for query, filters and page
4. **Wait with assertions** (`toHaveURL`, `toBeVisible`) instead of fixed timeouts
5. **Independent tests**: each test gets fresh storage, so services, saved titles and pins start empty

## Debugging Tests

Screenshots and videos are captured on failure and saved in `test-results/`. Use
`npm run test:e2e:ui` or `npm run test:e2e:debug` to step through a test.

## CI/CD Integration

Tests run automatically on push and pull requests via GitHub Actions (`.github/workflows/playwright.yml`).

The workflow:

1. Installs dependencies (cached)
2. Installs the Playwright Chromium browser (cached)
3. Builds the app and runs all E2E tests (cached build)
4. Uploads test reports and failure artifacts

## Test Coverage

- **Search**: popular titles by country, search-as-you-type, shared URLs, pagination, no results
- **Autocomplete**: suggestions, keyboard navigation, opening titles
- **Filters**: media type, genres, rating, years, language, sort, URL restore and reset
- **Preferences**: my services (dialog, persistence, "only my services"), country picker and URL override
- **Title page**: details, availability verdict, provider links, country comparison, pinning
- **Saved titles**: save, list, persist, remove
- **Recently viewed**: offered from the empty search box
- **Error Handling**: catalogue, title, providers and genres failures; 404 routes
- **Accessibility**: landmarks, combobox semantics, dialog focus, pressed states, alerts
- **Responsive**: mobile, tablet, desktop viewports without horizontal overflow
- **Visual Regression**: every page plus dialogs, popovers and states

## Configuration

Test configuration is in `playwright.config.ts`:

- **Browsers**: Chromium only (projects: `chromium`, `Tablet`, `Mobile Chrome`; tablet/mobile run only the responsive and visual-regression specs)
- **Base URL**: `http://localhost:3001`
- **Server**: a production build (`next build && next start`) is started automatically before the run
- **Retries**: 1 on CI, 0 locally
- **Snapshots**: OS-independent (no platform suffix); regenerate after a UI change or Playwright upgrade with `npx playwright test visual-regression --update-snapshots`

## Troubleshooting

- **Browser not found**: run `npx playwright install chromium`
- **Port 3001 already in use**: stop the process using it or change the port in `playwright.config.ts`
- **Flaky test**: check that every API the page calls is mocked and that the test waits on an assertion

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
