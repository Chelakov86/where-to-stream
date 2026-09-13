import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the title detail page.
 */
export class TitlePage extends BasePage {
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly saveButton: Locator;
  readonly trailerLink: Locator;
  readonly availability: Locator;
  readonly availabilityHeading: Locator;
  readonly verdict: Locator;
  readonly compareLink: Locator;
  readonly castSection: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.backLink = page.getByRole('link', { name: 'Back to search' });
    this.saveButton = page.getByRole('button', { name: /^(Save title|Saved)$/ });
    this.trailerLink = page.getByRole('link', { name: 'Watch trailer' });
    this.availability = page.locator('section[aria-labelledby="availability-heading"]');
    this.availabilityHeading = page.locator('#availability-heading');
    this.verdict = this.availability.getByRole('status');
    this.compareLink = this.availability.getByRole('link', { name: /^Compare \d+ countr/ });
    this.castSection = page.locator('section[aria-labelledby="cast-heading"]');
    this.errorHeading = page.getByRole('heading', { name: "We couldn't load this title" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
  }

  async gotoTitle(type: 'movie' | 'tv', id: number, country?: string): Promise<void> {
    await this.goto(`/title/${type}/${id}${country ? `?country=${country}` : ''}`);
  }

  async waitForTitle(): Promise<void> {
    await expect(this.availability).toBeVisible();
  }

  providerLink(name: string): Locator {
    return this.availability.getByRole('link', { name: `Watch on ${name} (opens in a new tab)` });
  }
}
