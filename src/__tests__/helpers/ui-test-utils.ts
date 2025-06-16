import { Page } from 'puppeteer';

export class UITestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for an element to be visible and return it
   */
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { visible: true, timeout });
    return this.page.$(selector);
  }

  /**
   * Check if Tailwind CSS is loaded by verifying computed styles
   */
  async isTailwindLoaded(): Promise<boolean> {
    try {
      const hasGridClass = await this.page.evaluate(() => {
        const element = document.querySelector('.grid');
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display === 'grid';
      });
      return hasGridClass;
    } catch {
      return false;
    }
  }

  /**
   * Take a screenshot for debugging failed tests
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Check if page is responsive at given viewport
   */
  async checkResponsiveLayout(width: number, height: number): Promise<boolean> {
    await this.page.setViewport({ width, height });
    await this.page.reload({ waitUntil: 'networkidle0' });
    
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    return bodyWidth <= width;
  }

  /**
   * Get text content of multiple elements
   */
  async getTextContents(selector: string): Promise<string[]> {
    return this.page.$$eval(selector, elements => 
      elements.map(el => el.textContent?.trim() || '')
    );
  }

  /**
   * Check if element has specific CSS class
   */
  async hasClass(selector: string, className: string): Promise<boolean> {
    return this.page.$eval(selector, (el, cls) => 
      el.classList.contains(cls), className
    );
  }

  /**
   * Wait for navigation and ensure page is loaded
   */
  async navigateAndWait(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle0' });
  }

  /**
   * Check accessibility basics (alt tags, etc.)
   */
  async checkBasicAccessibility(): Promise<{
    missingAltTags: number;
    missingLabels: number;
  }> {
    const missingAltTags = await this.page.$$eval('img:not([alt])', imgs => imgs.length);
    const missingLabels = await this.page.$$eval('input:not([aria-label]):not([title])', inputs => 
      inputs.filter(input => !input.closest('label')).length
    );
    
    return { missingAltTags, missingLabels };
  }

  /**
   * Simulate form interaction
   */
  async fillAndSubmitForm(formData: Record<string, string>, submitSelector: string): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.type(`input[name="${field}"], select[name="${field}"]`, value);
    }
    await this.page.click(submitSelector);
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  /**
   * Check for console errors
   */
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }
} 