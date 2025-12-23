import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ResultDetailsPage Page Object Model
 * Handles interactions with the result details modal/section
 */
export class ResultDetailsPage extends BasePage {
  readonly detailsSection: Locator;
  readonly title: Locator;
  readonly year: Locator;
  readonly typeLabel: Locator;
  readonly runtime: Locator;
  readonly genres: Locator;
  readonly rating: Locator;
  readonly overview: Locator;
  readonly poster: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly availabilitySection: Locator;
  readonly preferredCountriesTable: Locator;
  readonly otherCountriesTable: Locator;
  readonly noAvailabilityMessage: Locator;
  readonly availabilityTables: Locator;

  constructor(page: Page) {
    super(page);
    this.detailsSection = page.locator('section[aria-labelledby^="result-details"]');
    this.title = page.locator('h2[id^="result-details"]');
    this.year = page
      .locator('section[aria-labelledby^="result-details"] span:has-text(/\\d{4}/)')
      .first();
    this.typeLabel = page.locator(
      'section[aria-labelledby^="result-details"] span:has-text(/Movie|TV Show/)'
    );
    this.runtime = page.locator(
      'section[aria-labelledby^="result-details"] span:has-text(/\\d+h|\\d+m/)'
    );
    this.genres = page.locator(
      'section[aria-labelledby^="result-details"] div:has-text("Genres:")'
    );
    this.rating = page.locator('[data-testid="rating"]');
    this.overview = page.locator('section[aria-labelledby^="result-details"] p.text-gray-300');
    this.poster = page.locator('section[aria-labelledby^="result-details"] img[alt*="Poster"]');
    this.loadingIndicator = page.locator('text=Loading details...');
    this.errorMessage = page.locator("text=We're having trouble fetching data right now");
    this.availabilitySection = page.locator('h3:has-text("Streaming Availability")');
    this.preferredCountriesTable = page
      .locator('h4:has-text("Available in Your Region")')
      .locator('..')
      .locator('table');
    this.otherCountriesTable = page
      .locator('h4:has-text("Other Countries")')
      .locator('..')
      .locator('table');
    this.noAvailabilityMessage = page.locator('text=No streaming availability found');
    this.availabilityTables = page.locator('table[aria-label]');
  }

  /**
   * Wait for details to load
   */
  async waitForDetails(timeout?: number): Promise<void> {
    await this.detailsSection.waitFor({ state: 'visible', timeout });
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(timeout?: number): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get title text
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  /**
   * Get year text
   */
  async getYear(): Promise<string> {
    return (await this.year.textContent()) || '';
  }

  /**
   * Get type text (Movie or TV Show)
   */
  async getType(): Promise<string> {
    return (await this.typeLabel.textContent()) || '';
  }

  /**
   * Get runtime text
   */
  async getRuntime(): Promise<string> {
    return (await this.runtime.textContent()) || '';
  }

  /**
   * Get genres text
   */
  async getGenres(): Promise<string> {
    const genresText = (await this.genres.textContent()) || '';
    // Extract genres part after "Genres:"
    return genresText.replace('Genres:', '').trim();
  }

  /**
   * Get rating value
   */
  async getRating(): Promise<string> {
    const ratingText = (await this.rating.textContent()) || '';
    // Extract rating number
    const match = ratingText.match(/(\d+\.?\d*)\/10/);
    return match ? match[1] : '';
  }

  /**
   * Get overview text
   */
  async getOverview(): Promise<string> {
    return (await this.overview.textContent()) || '';
  }

  /**
   * Check if poster is visible
   */
  async isPosterVisible(): Promise<boolean> {
    return await this.poster.isVisible();
  }

  /**
   * Get poster source URL
   */
  async getPosterSrc(): Promise<string | null> {
    return await this.poster.getAttribute('src');
  }

  /**
   * Check if loading indicator is visible
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingIndicator.isVisible();
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Check if availability section is visible
   */
  async isAvailabilityVisible(): Promise<boolean> {
    return await this.availabilitySection.isVisible();
  }

  /**
   * Get availability tables count
   */
  async getAvailabilityTablesCount(): Promise<number> {
    return await this.availabilityTables.count();
  }

  /**
   * Get preferred countries table rows count
   */
  async getPreferredCountriesCount(): Promise<number> {
    if ((await this.preferredCountriesTable.count()) === 0) {
      return 0;
    }
    // Exclude header row
    return await this.preferredCountriesTable.locator('tbody tr').count();
  }

  /**
   * Get other countries table rows count
   */
  async getOtherCountriesCount(): Promise<number> {
    if ((await this.otherCountriesTable.count()) === 0) {
      return 0;
    }
    // Exclude header row
    return await this.otherCountriesTable.locator('tbody tr').count();
  }

  /**
   * Check if no availability message is shown
   */
  async hasNoAvailability(): Promise<boolean> {
    return await this.noAvailabilityMessage.isVisible();
  }

  /**
   * Get country availability data from table
   */
  async getCountryAvailability(
    table: 'preferred' | 'other',
    index: number
  ): Promise<{
    country: string;
    hasNetflix: boolean;
    otherProviders: string;
    watchLink: string | null;
  }> {
    const tableLocator =
      table === 'preferred' ? this.preferredCountriesTable : this.otherCountriesTable;
    const row = tableLocator.locator('tbody tr').nth(index);

    const country = (await row.locator('td').nth(0).textContent()) || '';
    const netflix = (await row.locator('td').nth(1).textContent()) || '';
    const otherProviders = (await row.locator('td').nth(2).textContent()) || '';
    const watchLinkElement = row.locator('td').nth(3).locator('a');
    const watchLink =
      (await watchLinkElement.count()) > 0 ? await watchLinkElement.getAttribute('href') : null;

    return {
      country: country.trim(),
      hasNetflix: netflix.trim() === 'Yes',
      otherProviders: otherProviders.trim(),
      watchLink,
    };
  }

  /**
   * Click watch link for a country
   */
  async clickWatchLink(table: 'preferred' | 'other', index: number): Promise<void> {
    const tableLocator =
      table === 'preferred' ? this.preferredCountriesTable : this.otherCountriesTable;
    const row = tableLocator.locator('tbody tr').nth(index);
    await row.locator('td').nth(3).locator('a').click();
  }
}
