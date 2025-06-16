import puppeteer, { Browser, Page } from 'puppeteer';
import app from '../app';
import { Server } from 'http';
import mongoose from 'mongoose';

let browser: Browser;
let page: Page;
let server: Server;
const TEST_PORT = 3001;

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test-db');
  
  // Start test server
  server = app.listen(TEST_PORT);
  
  // Launch browser
  browser = await puppeteer.launch({
    headless: true, // Set to false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 1280, height: 720 });
});

afterAll(async () => {
  await browser.close();
  await mongoose.connection.close();
  server.close();
});

beforeEach(async () => {
  // Clear any existing page state
  await page.goto('about:blank');
});

describe('UI Tests', () => {
  describe('Homepage', () => {
    it('should load the homepage with correct title and content', async () => {
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      // Check page title
      const title = await page.title();
      expect(title).toBe('Home | Document Extraction Service');
      
      // Check main heading
      const heading = await page.$eval('h1', el => el.textContent);
      expect(heading).toContain('Document Extraction Service');
      
      // Check that CSS is loaded by verifying the header has gradient class
      const headerHasGradient = await page.$eval('header', el => 
        el.classList.contains('gradient-header')
      );
      expect(headerHasGradient).toBe(true);
    });

    it('should display service status as running', async () => {
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      const statusText = await page.$eval('.text-green-700', el => el.textContent);
      expect(statusText).toContain('Service is running');
    });

    it('should display extraction statistics', async () => {
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      // Check that stats grid exists and has stat cards
      const statsCards = await page.$$('.grid > .bg-white');
      expect(statsCards.length).toBe(4); // Total, Completed, Processing, Failed
      
      // Check that each stat card has a number and label
      for (const card of statsCards) {
        const number = await card.$('.text-3xl');
        const label = await card.$('.text-sm');
        expect(number).toBeTruthy();
        expect(label).toBeTruthy();
      }
    });

    it('should have working navigation links', async () => {
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      // Check that navigation links exist
      const apiDocsLink = await page.$('a[href="/api-docs"]');
      const healthLink = await page.$('a[href="/api/health"]');
      const extractionsPageLink = await page.$('a[href="/extractions"]');
      
      expect(apiDocsLink).toBeTruthy();
      expect(healthLink).toBeTruthy();
      expect(extractionsPageLink).toBeTruthy();
    });
  });

  describe('Extractions Page', () => {
    it('should load the extractions page with correct content', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check page title
      const title = await page.title();
      expect(title).toBe('Extractions | Document Extraction Service');
      
      // Check main heading
      const heading = await page.$eval('h2', el => el.textContent);
      expect(heading).toContain('Document Extractions');
      
      // Check that extraction count is displayed
      const countText = await page.$eval('.text-sm', el => el.textContent);
      expect(countText).toMatch(/Total extractions found: \d+/);
    });

    it('should display extraction data when available', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check if extractions are shown (this will depend on test data)
      const extractionElements = await page.$('.bg-gray-100');
      expect(extractionElements).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate between pages correctly', async () => {
      // Start at homepage
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      // Navigate to extractions page using the link from homepage
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
        page.click('a[href="/extractions"]')
      ]);
      
      // Should be on extractions page
      const title = await page.title();
      expect(title).toBe('Extractions | Document Extraction Service');
    }, 15000); // Reduced timeout to 15 seconds

    it('should handle 404 pages gracefully', async () => {
      const response = await page.goto(`http://localhost:${TEST_PORT}/nonexistent-page`);
      
      expect(response?.status()).toBe(404);
      
      const title = await page.title();
      expect(title).toBe('Page Not Found | Document Extraction Service');
      
      const errorMessage = await page.$eval('.text-red-600', el => el.textContent);
      expect(errorMessage).toContain('was not found');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      // Check that the page loads without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375);
      
      // Check that main content is visible
      const mainContent = await page.$('main');
      expect(mainContent).toBeTruthy();
    });

    it('should adapt to desktop viewport', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(`http://localhost:${TEST_PORT}`);
      
      // Check that stats are displayed in grid format on larger screens
      const statsGrid = await page.$('.grid-cols-2');
      expect(statsGrid).toBeTruthy();
    });
  });
}); 