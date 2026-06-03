import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * HomePage Page Object Model
 * Handles interactions with the main search page
 */
export class HomePage extends BasePage {
  // Search form elements
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly filterToggleButton: Locator;
  readonly filterSection: Locator;

  // Filter elements
  readonly typeSelect: Locator;
  readonly yearFromInput: Locator;
  readonly yearToInput: Locator;
  readonly languageSelect: Locator;
  readonly minRatingSlider: Locator;
  readonly minRatingValue: Locator;

  // Autocomplete elements
  readonly autocompleteList: Locator;
  readonly autocompleteItems: Locator;

  // Results elements
  readonly resultsList: Locator;
  readonly resultItems: Locator;
  readonly noResultsMessage: Locator;
  readonly initialPrompt: Locator;
  readonly paginationPrevious: Locator;
  readonly paginationNext: Locator;
  readonly paginationInfo: Locator;
  readonly searchingIndicator: Locator;

  // Search history elements
  readonly searchHistorySection: Locator;
  readonly searchHistoryToggle: Locator;
  readonly searchHistoryItems: Locator;
  readonly clearHistoryButton: Locator;

  // Error banner
  readonly errorBanner: Locator;
  readonly errorMessage: Locator;
  readonly dismissErrorButton: Locator;

  // Page title and description
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;

  constructor(page: Page) {
    super(page);
    // Search form
    this.searchInput = page.locator('input#query');
    this.searchButton = page.locator('button[type="submit"]');
    this.filterToggleButton = page.locator('button[aria-controls="filter-section"]');
    this.filterSection = page.locator('#filter-section');

    // Filters
    this.typeSelect = page.locator('select#type');
    this.yearFromInput = page.locator('input#yearFrom');
    this.yearToInput = page.locator('input#yearTo');
    this.languageSelect = page.locator('select#language');
    this.minRatingSlider = page.locator('input#minRating');
    this.minRatingValue = page.locator('label[for="minRating"] span');

    // Autocomplete
    this.autocompleteList = page.locator('#search-autocomplete-list');
    this.autocompleteItems = page.locator('#search-autocomplete-list li[role="option"]');

    // Results
    this.resultsList = page.locator('ul[role="list"]');
    this.resultItems = page.locator('ul[role="list"] li');
    this.noResultsMessage = page.locator('text=No titles found');
    this.initialPrompt = page.locator(
      "text=Search for a movie or series to see where it's streaming"
    );
    this.paginationPrevious = page.locator('button:has-text("Previous")');
    this.paginationNext = page.locator('button:has-text("Next")');
    this.paginationInfo = page.locator('text=/Page \\d+ of \\d+/');
    this.searchingIndicator = page.locator('text=Searching...');

    // Search history
    this.searchHistorySection = page.locator('aside:has-text("Search History")');
    this.searchHistoryToggle = page.locator('button[aria-controls="search-history-list"]');
    this.searchHistoryItems = page.locator('#search-history-list button[aria-label^="View"]');
    this.clearHistoryButton = page.locator('button[aria-label="Clear all search history"]');

    // Error banner
    this.errorBanner = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    this.errorMessage = this.errorBanner.locator('p');
    this.dismissErrorButton = page.locator('button[aria-label="Dismiss error"]');

    // Page elements
    this.pageTitle = page.locator('h1:has-text("WhereToStream")');
    this.pageDescription = page.locator(
      'text=Find where your favorite movies and TV shows are streaming'
    );
  }

  /**
   * Navigate to home page
   */
  async goto(): Promise<void> {
    await super.goto('/');
    await this.waitForLoad();
  }

  /**
   * Enter search query
   */
  async enterSearchQuery(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Type search query (simulates typing)
   */
  async typeSearchQuery(query: string, delay?: number): Promise<void> {
    await this.searchInput.type(query, { delay });
  }

  /**
   * Submit search form
   */
  async submitSearch(): Promise<void> {
    await this.searchButton.click();
  }

  /**
   * Perform a search with query
   */
  async search(query: string): Promise<void> {
    await this.enterSearchQuery(query);
    await this.submitSearch();
  }

  /**
   * Toggle filters panel
   */
  async toggleFilters(): Promise<void> {
    await this.filterToggleButton.click();
  }

  /**
   * Select content type filter
   */
  async selectType(type: 'all' | 'movie' | 'tv'): Promise<void> {
    await this.typeSelect.selectOption(type);
  }

  /**
   * Set year range filters
   */
  async setYearRange(from?: number, to?: number): Promise<void> {
    if (from !== undefined) {
      await this.yearFromInput.fill(from.toString());
    }
    if (to !== undefined) {
      await this.yearToInput.fill(to.toString());
    }
  }

  /**
   * Select language filter
   */
  async selectLanguage(language: string): Promise<void> {
    await this.languageSelect.selectOption(language);
  }

  /**
   * Set minimum rating
   */
  async setMinRating(rating: number): Promise<void> {
    await this.minRatingSlider.fill(rating.toString());
  }

  /**
   * Select genre by checkbox
   */
  async selectGenre(genreId: number): Promise<void> {
    await this.page.locator(`input[name="genre"][value="${genreId}"]`).check();
  }

  /**
   * Unselect genre by checkbox
   */
  async unselectGenre(genreId: number): Promise<void> {
    await this.page.locator(`input[name="genre"][value="${genreId}"]`).uncheck();
  }

  /**
   * Select multiple genres
   */
  async selectGenres(genreIds: number[]): Promise<void> {
    for (const id of genreIds) {
      await this.selectGenre(id);
    }
  }

  /**
   * Wait for autocomplete to appear
   */
  async waitForAutocomplete(timeout?: number): Promise<void> {
    await this.autocompleteList.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for autocomplete to disappear
   */
  async waitForAutocompleteHidden(timeout?: number): Promise<void> {
    await this.autocompleteList.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get autocomplete suggestions count
   */
  async getAutocompleteCount(): Promise<number> {
    return await this.autocompleteItems.count();
  }

  /**
   * Select autocomplete item by index
   */
  async selectAutocompleteItem(index: number): Promise<void> {
    await this.autocompleteItems.nth(index).click();
  }

  /**
   * Select autocomplete item by text
   */
  async selectAutocompleteItemByText(text: string): Promise<void> {
    await this.autocompleteItems.filter({ hasText: text }).first().click();
  }

  /**
   * Navigate autocomplete with arrow keys
   */
  async navigateAutocomplete(direction: 'up' | 'down'): Promise<void> {
    const key = direction === 'down' ? 'ArrowDown' : 'ArrowUp';
    await this.searchInput.press(key);
  }

  /**
   * Press Enter on autocomplete
   */
  async pressEnterOnAutocomplete(): Promise<void> {
    await this.searchInput.press('Enter');
  }

  /**
   * Press Escape to close autocomplete
   */
  async pressEscapeOnAutocomplete(): Promise<void> {
    await this.searchInput.press('Escape');
  }

  /**
   * Wait for search results
   */
  async waitForResults(timeout?: number): Promise<void> {
    await this.resultsList.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get results count
   */
  async getResultsCount(): Promise<number> {
    return await this.resultItems.count();
  }

  /**
   * Click on a result item by index
   */
  async clickResultItem(index: number): Promise<void> {
    await this.resultItems.nth(index).click();
  }

  /**
   * Click on a result item by text
   */
  async clickResultItemByText(text: string): Promise<void> {
    await this.resultItems.filter({ hasText: text }).first().click();
  }

  /**
   * Navigate to next page
   */
  async goToNextPage(): Promise<void> {
    await this.paginationNext.click();
  }

  /**
   * Navigate to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.paginationPrevious.click();
  }

  /**
   * Get pagination info text
   */
  async getPaginationInfo(): Promise<string> {
    return (await this.paginationInfo.textContent()) || '';
  }

  /**
   * Wait for searching indicator to disappear
   */
  async waitForSearchComplete(timeout?: number): Promise<void> {
    await this.searchingIndicator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Toggle search history
   */
  async toggleSearchHistory(): Promise<void> {
    await this.searchHistoryToggle.click();
  }

  /**
   * Get search history items count
   */
  async getSearchHistoryCount(): Promise<number> {
    return await this.searchHistoryItems.count();
  }

  /**
   * Click on a search history item by index
   */
  async clickSearchHistoryItem(index: number): Promise<void> {
    await this.searchHistoryItems.nth(index).click();
  }

  /**
   * Remove search history item by index
   */
  async removeSearchHistoryItem(index: number): Promise<void> {
    const item = this.searchHistoryItems.nth(index);
    await item.hover();
    await this.page.locator(`button[aria-label*="Remove"]`).nth(index).click();
  }

  /**
   * Clear all search history
   */
  async clearSearchHistory(): Promise<void> {
    // Handle confirmation dialog
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.clearHistoryButton.click();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Dismiss error banner
   */
  async dismissError(): Promise<void> {
    await this.dismissErrorButton.click();
  }

  /**
   * Wait for error banner to appear
   */
  async waitForError(timeout?: number): Promise<void> {
    await this.errorBanner.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for error banner to disappear
   */
  async waitForErrorHidden(timeout?: number): Promise<void> {
    await this.errorBanner.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Check if filters are visible
   */
  async areFiltersVisible(): Promise<boolean> {
    return await this.filterSection.isVisible();
  }

  /**
   * Check if autocomplete is visible
   */
  async isAutocompleteVisible(): Promise<boolean> {
    return await this.autocompleteList.isVisible();
  }

  /**
   * Check if search history is expanded
   */
  async isSearchHistoryExpanded(): Promise<boolean> {
    const expanded = await this.searchHistoryToggle.getAttribute('aria-expanded');
    return expanded === 'true';
  }
}
