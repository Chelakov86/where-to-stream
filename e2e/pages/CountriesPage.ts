import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the country comparison page.
 */
export class CountriesPage extends BasePage {
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly filterInput: Locator;
  readonly onMyServicesButton: Locator;
  readonly countryCards: Locator;
  readonly countryNames: Locator;
  readonly noMatches: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.backLink = page.getByRole('link', { name: 'Back to title' });
    this.filterInput = page.getByLabel('Filter countries');
    this.onMyServicesButton = page.getByRole('button', { name: 'On my services' });
    this.countryCards = page.getByRole('main').locator('ul > li');
    this.countryNames = this.countryCards.getByRole('heading', { level: 2 });
    this.noMatches = page.getByText('No countries match those filters.');
  }

  async gotoCountries(type: 'movie' | 'tv', id: number, country?: string): Promise<void> {
    await this.goto(`/title/${type}/${id}/countries${country ? `?country=${country}` : ''}`);
    await expect(this.heading).toBeVisible();
  }

  card(countryName: string): Locator {
    return this.countryCards.filter({
      has: this.page.getByRole('heading', { name: countryName, exact: true }),
    });
  }

  pinButton(countryName: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^(Pin|Unpin) ${countryName}$`) });
  }
}
