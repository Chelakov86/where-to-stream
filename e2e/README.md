# Playwright E2E Test Suite

This directory contains end-to-end tests for the WhereToStream application using Playwright.

## Structure

```
e2e/
├── pages/              # Page Object Models (POM)
│   ├── BasePage.ts     # Base class with common methods
│   ├── HomePage.ts     # Home page interactions
│   └── ResultDetailsPage.ts  # Result details interactions
├── fixtures/           # Custom Playwright fixtures
│   └── test-fixtures.ts
├── helpers/            # Test utilities and helpers
│   ├── api-mock.ts     # API mocking utilities
│   └── test-data.ts    # Test data constants
├── tests/              # Test files
│   ├── search.e2e.spec.ts
│   ├── autocomplete.e2e.spec.ts
│   ├── filters.e2e.spec.ts
│   ├── results.e2e.spec.ts
│   ├── search-history.e2e.spec.ts
│   ├── error-handling.e2e.spec.ts
│   ├── accessibility.e2e.spec.ts
│   ├── responsive.e2e.spec.ts
│   └── visual-regression.e2e.spec.ts
├── global-setup.ts     # Global setup (runs before all tests)
├── global-teardown.ts  # Global teardown (runs after all tests)
└── README.md           # This file
```

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)

```bash
npm run test:e2e:ui
```

### Run tests in debug mode

```bash
npm run test:e2e:debug
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Run tests only in Chromium

```bash
npm run test:e2e:chromium
```

### View test report

```bash
npm run test:e2e:report
```

### Run all tests (Jest + Playwright)

```bash
npm run test:all
```

## Page Object Model (POM)

We use the Page Object Model pattern to encapsulate page interactions and make tests more maintainable.

### BasePage

Base class with common methods like navigation, waiting, element interactions.

### HomePage

Handles interactions with the main search page:

- Search form interactions
- Autocomplete handling
- Filter toggling and interactions
- Result list interactions
- Search history interactions
- Error banner interactions

### ResultDetailsPage

Handles interactions with result details:

- Title information display
- Streaming availability tables
- Loading and error states

## Test Fixtures

Custom fixtures are defined in `fixtures/test-fixtures.ts`:

- `homePage`: Pre-configured HomePage instance with mocked APIs
- `resultDetailsPage`: Pre-configured ResultDetailsPage instance

## API Mocking

Tests use API mocking to avoid external dependencies and ensure fast, reliable tests. Mock utilities are in `helpers/api-mock.ts`:

- `mockGenres()`: Mock genres API
- `mockSearch()`: Mock search API
- `mockTitleDetails()`: Mock title details API
- `mockSearchError()`: Mock search API errors
- `mockNetworkFailure()`: Simulate network failures

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/test-fixtures';
import { mockSearch } from '../helpers/api-mock';

test.describe('Feature Name', () => {
  test('should do something', async ({ homePage, page }) => {
    await mockSearch(page);

    await homePage.search('query');
    await homePage.waitForResults();

    await expect(homePage.resultsList).toBeVisible();
  });
});
```

### Using Page Object Models

```typescript
// Use methods from HomePage
await homePage.search('query');
await homePage.toggleFilters();
await homePage.selectType('movie');

// Use methods from ResultDetailsPage
await resultDetailsPage.waitForDetails();
const title = await resultDetailsPage.getTitle();
```

### Mocking APIs

```typescript
// Mock successful response
await mockSearch(page);

// Mock with custom data
await mockSearch(page, customResults);

// Mock error
await mockSearchError(page, 500);

// Mock network failure
await mockNetworkFailure(page, '**/api/search**');
```

### Best Practices

1. **Use Page Object Models**: Always use POM methods instead of direct selectors
2. **Mock APIs**: Always mock API responses for fast, reliable tests
3. **Wait for elements**: Use explicit waits (`waitForResults()`, `waitForDetails()`) instead of fixed timeouts
4. **Independent tests**: Each test should be independent and not rely on other tests
5. **Clear test names**: Use descriptive test names that explain what is being tested
6. **Group related tests**: Use `test.describe()` to group related tests

## Debugging Tests

### Debug Mode

Run tests in debug mode to step through execution:

```bash
npm run test:e2e:debug
```

### UI Mode

Use UI mode for interactive debugging:

```bash
npm run test:e2e:ui
```

### Headed Mode

Run tests with visible browser:

```bash
npm run test:e2e:headed
```

### Screenshots and Videos

Screenshots and videos are automatically captured on test failures and saved in `test-results/`.

## CI/CD Integration

Tests run automatically on push and pull requests via GitHub Actions (`.github/workflows/playwright.yml`).

The workflow:

1. Installs dependencies
2. Installs Playwright browsers
3. Runs all E2E tests
4. Uploads test reports and artifacts

## Test Coverage

The test suite covers:

- **Search**: Basic search, empty search, pagination
- **Autocomplete**: Suggestions, keyboard navigation, mouse selection
- **Filters**: Type, year, language, genres, rating
- **Results**: Display, selection, pagination
- **Search History**: Display, selection, removal, persistence
- **Error Handling**: API errors, network failures, validation
- **Accessibility**: Keyboard navigation, ARIA attributes, focus management
- **Responsive**: Mobile, tablet, desktop viewports
- **Visual Regression**: Screenshot comparisons

## Configuration

Test configuration is in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit
- **Viewports**: Desktop, Mobile, Tablet
- **Base URL**: `http://localhost:3000`
- **Timeouts**: Configurable per test
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure

## Troubleshooting

### Tests fail with "Server not ready"

Make sure the Next.js dev server is running or let Playwright start it automatically (configured in `playwright.config.ts`).

### Tests are flaky

- Check for proper waits (`waitForResults()`, `waitForDetails()`)
- Ensure APIs are properly mocked
- Check for race conditions

### Browser not found

Run `npx playwright install` to install browsers.

### Port 3000 already in use

Stop any process using port 3000 or change the port in `playwright.config.ts`.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
