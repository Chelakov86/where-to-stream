import { Page, Locator, Request, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the search page and the app header.
 */
export class HomePage extends BasePage {
  // Header
  readonly header: Locator;
  readonly savedLink: Locator;
  readonly servicesButton: Locator;
  readonly servicesDialog: Locator;
  readonly countryButton: Locator;

  // Hero and search box
  readonly heroHeading: Locator;
  readonly searchInput: Locator;
  readonly clearSearchButton: Locator;
  readonly suggestionList: Locator;
  readonly suggestions: Locator;

  // Results
  readonly resultsSection: Locator;
  readonly resultsHeading: Locator;
  readonly titleCards: Locator;
  readonly emptyState: Locator;
  readonly errorAlert: Locator;
  readonly pagination: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;

  // Filters
  readonly typeGroup: Locator;
  readonly filtersButton: Locator;
  readonly filtersPopover: Locator;
  readonly onlyMineSwitch: Locator;
  readonly sortSelect: Locator;

  constructor(page: Page) {
    super(page);

    this.header = page.getByRole('banner');
    this.savedLink = this.header.getByRole('link', { name: 'Saved titles' });
    this.servicesButton = this.header.getByRole('button', { name: /^My services/ });
    this.servicesDialog = page.getByRole('dialog', { name: 'Your streaming services' });
    this.countryButton = this.header.getByRole('combobox', { name: /^Country:/ });

    this.heroHeading = page.getByRole('heading', { level: 1 });
    this.searchInput = page.getByRole('combobox', { name: 'Search movies and TV shows' });
    this.clearSearchButton = page.getByRole('button', { name: 'Clear search' });
    this.suggestionList = page.locator('#search-suggestions');
    this.suggestions = this.suggestionList.getByRole('option');

    this.resultsSection = page.locator('section[aria-labelledby="results-heading"]');
    this.resultsHeading = page.locator('#results-heading');
    this.titleCards = this.resultsSection.locator('ul > li > a');
    this.emptyState = this.resultsSection.getByText(
      /^(Nothing matched those filters|No titles found)$/
    );
    this.errorAlert = this.resultsSection.getByRole('alert');
    this.pagination = page.getByRole('navigation', { name: 'Pagination' });
    this.nextPageButton = this.pagination.getByRole('button', { name: 'Next' });
    this.previousPageButton = this.pagination.getByRole('button', { name: 'Previous' });

    this.typeGroup = page.getByRole('group', { name: 'Media type' });
    this.filtersButton = page.getByRole('button', { name: /^Filters/ });
    this.filtersPopover = page.getByRole('dialog').filter({ hasText: 'Minimum rating' });
    this.onlyMineSwitch = page.getByRole('switch', { name: 'Only my services' });
    this.sortSelect = page.getByRole('combobox', { name: 'Sort results' });
  }

  /**
   * Open the search page, optionally with URL state (e.g. "q=dune&type=movie").
   */
  async goto(query: string = ''): Promise<void> {
    await super.goto(query ? `/?${query}` : '/');
    await expect(this.heroHeading).toBeVisible();
  }

  /**
   * Type a query and wait until it is committed to the URL.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForURL((url) => url.searchParams.get('q') === query.trim());
  }

  /**
   * Type into the search box key by key (triggers suggestions).
   */
  async typeSearchQuery(query: string, delay = 30): Promise<void> {
    await this.searchInput.pressSequentially(query, { delay });
  }

  async waitForResults(): Promise<void> {
    await expect(this.titleCards.first()).toBeVisible();
  }

  async openTitleCard(name: string | RegExp): Promise<void> {
    await this.titleCards.filter({ hasText: name }).first().click();
  }

  async selectType(label: 'All' | 'Movies' | 'Series'): Promise<void> {
    await this.typeGroup.getByRole('button', { name: label }).click();
  }

  async openFilters(): Promise<void> {
    await this.filtersButton.click();
    await expect(this.filtersPopover).toBeVisible();
  }

  async chooseCountry(name: string): Promise<void> {
    await this.countryButton.click();
    await this.page.getByPlaceholder('Search countries…').fill(name);
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async openServices(): Promise<void> {
    await this.servicesButton.click();
    await expect(this.servicesDialog).toBeVisible();
  }

  async toggleService(name: string): Promise<void> {
    await this.servicesDialog.getByRole('button', { name, exact: true }).click();
  }

  async closeDialog(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Resolves with the next full-mode /api/search request.
   */
  nextSearchRequest(): Promise<Request> {
    return this.page.waitForRequest((request) => {
      if (!request.url().includes('/api/search')) return false;
      return new URL(request.url()).searchParams.get('mode') !== 'autocomplete';
    });
  }
}
