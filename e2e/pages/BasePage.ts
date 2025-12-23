import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model class with common methods
 * All page objects should extend this class
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for a specific element to be visible
   */
  async waitForElement(selector: string | Locator, timeout?: number): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for a specific element to be hidden
   */
  async waitForElementHidden(selector: string | Locator, timeout?: number): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string | Locator): Promise<string> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return (await locator.textContent()) || '';
  }

  /**
   * Click on an element
   */
  async click(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.click();
  }

  /**
   * Fill an input field
   */
  async fill(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.fill(value);
  }

  /**
   * Type into an input field (simulates typing)
   */
  async type(
    selector: string | Locator,
    value: string,
    options?: { delay?: number }
  ): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.type(value, options);
  }

  /**
   * Check if an element is visible
   */
  async isVisible(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await locator.isVisible().catch(() => false);
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path });
  }

  /**
   * Wait for network requests to complete
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for a specific URL
   */
  async waitForURL(url: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await this.page.waitForURL(url, options);
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Press a key
   */
  async pressKey(selector: string | Locator, key: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.press(key);
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(
    selector: string | Locator,
    value: string | { label?: string; value?: string }
  ): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.selectOption(value);
  }

  /**
   * Check a checkbox
   */
  async check(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.check();
  }

  /**
   * Uncheck a checkbox
   */
  async uncheck(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.uncheck();
  }

  /**
   * Get count of elements matching selector
   */
  async getCount(selector: string | Locator): Promise<number> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return await locator.count();
  }

  /**
   * Wait for API response
   */
  async waitForResponse(url: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await this.page.waitForResponse(url, options);
  }
}
