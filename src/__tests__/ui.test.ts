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
}, 30000);

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
      
      // Check main heading in header
      const heading = await page.$eval('header h1', el => el.textContent);
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
      const statsCards = await page.$$('.grid.grid-cols-2 > .bg-white');
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
      
      // Check that extraction count is displayed in the Recent Extractions heading
      const extractionsHeadings = await page.$$eval('h3', elements => 
        elements.map(el => el.textContent?.trim())
      );
      const extractionsCountHeading = extractionsHeadings.find(text => 
        text?.includes('Recent Extractions')
      );
      expect(extractionsCountHeading).toMatch(/Recent Extractions \(\d+\)/);
    });

    it('should display file upload form', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check upload form exists
      const uploadForm = await page.$('#uploadForm');
      expect(uploadForm).toBeTruthy();
      
      // Check form has multipart encoding for file uploads
      const formEnctype = await page.$eval('#uploadForm', el => el.getAttribute('enctype'));
      expect(formEnctype).toBe('multipart/form-data');
      
      // Check file input exists
      const fileInput = await page.$('#file');
      expect(fileInput).toBeTruthy();
      
      // Check file input accepts correct file types
      const acceptAttr = await page.$eval('#file', el => el.getAttribute('accept'));
      expect(acceptAttr).toBe('.pdf,.doc,.docx,.txt');
      
      // Check submit button exists
      const submitBtn = await page.$('button[type="submit"]');
      expect(submitBtn).toBeTruthy();
      
      const submitBtnText = await page.$eval('button[type="submit"]', el => el.textContent);
      expect(submitBtnText?.trim()).toBe('Upload & Extract');
      
      // Check upload section heading by finding the h3 with specific text
      const uploadHeadings = await page.$$eval('h3', elements => 
        elements.map(el => el.textContent?.trim())
      );
      const uploadHeading = uploadHeadings.find(text => text === 'Upload New Document');
      expect(uploadHeading).toBe('Upload New Document');
    });

    it('should display extractions table when data is available', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check if table exists (will depend on whether there's data)
      const tableExists = await page.$('table') !== null;
      const emptyStateExists = await page.$('.px-6.py-12.text-center h3') !== null;
      
      // Either table or empty state should exist
      expect(tableExists || emptyStateExists).toBe(true);
      
      if (tableExists) {
        // If table exists, check table headers
        const headers = await page.$$eval('th', elements => 
          elements.map(el => el.textContent?.trim())
        );
        expect(headers).toContain('File Name');
        expect(headers).toContain('Status');
        expect(headers).toContain('Summary');
        expect(headers).toContain('Created');
      } else {
        // If empty state, check message
        const emptyMessage = await page.$eval('.px-6.py-12.text-center h3', el => el.textContent);
        expect(emptyMessage).toContain('No extractions yet');
      }
    });

    it('should have JavaScript loaded and form preventDefault working', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check that the external JavaScript file is loaded
      const scriptTag = await page.$('script[src="/js/extractions.js"]');
      expect(scriptTag).toBeTruthy();
      
      // Check that form has the upload form
      const uploadForm = await page.$('#uploadForm');
      expect(uploadForm).toBeTruthy();
      
      // Test that the JavaScript prevents default form submission
      const formHasEventListener = await page.evaluate(() => {
        const form = document.getElementById('uploadForm') as HTMLFormElement;
        if (!form) return false;
        
        // Mock fetch to prevent actual network calls in test
        (window as any).fetch = () => Promise.resolve({ ok: true });
        
        // Create a custom event and dispatch it
        const submitEvent = new Event('submit', { cancelable: true });
        form.dispatchEvent(submitEvent);
        
        // If preventDefault was called, defaultPrevented should be true
        return submitEvent.defaultPrevented;
      });
      
      expect(formHasEventListener).toBe(true);
    });

    it('should display status badges with correct colors', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check if there are any status badges in the table
      const statusBadges = await page.$$('.inline-flex.px-2.py-1');
      
      if (statusBadges.length > 0) {
        // Check that status badges have appropriate styling classes
        for (const badge of statusBadges) {
          const classes = await badge.evaluate(el => el.className);
          expect(classes).toMatch(/(bg-green-100|bg-yellow-100|bg-red-100|bg-gray-100)/);
          expect(classes).toMatch(/(text-green-800|text-yellow-800|text-red-800|text-gray-800)/);
        }
      }
    });

    it('should handle table responsiveness', async () => {
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check if table exists (responsiveness only applies when there's data)
      const table = await page.$('table');
      
      if (table) {
        // Check that table container has overflow-x-auto for mobile responsiveness
        const tableContainer = await page.$('.overflow-x-auto');
        expect(tableContainer).toBeTruthy();
        
        // Test mobile viewport
        await page.setViewport({ width: 375, height: 667 });
        await page.reload();
        
        // Table should still be accessible
        const tableAfterResize = await page.$('table');
        if (tableAfterResize) {
          const tableWidth = await tableAfterResize.evaluate(el => el.scrollWidth);
          expect(tableWidth).toBeGreaterThan(0);
        }
      } else {
        // If no table, verify the page structure is still responsive
        const mainContainer = await page.$('.space-y-8');
        expect(mainContainer).toBeTruthy();
      }
      
      // Reset viewport
      await page.setViewport({ width: 1280, height: 720 });
    });

    it('should display empty state when no extractions exist', async () => {
      // First, let's check the current state to see if we have data
      await page.goto(`http://localhost:${TEST_PORT}/extractions`);
      
      // Check the extraction count in the heading
      const extractionsHeadings = await page.$$eval('h3', elements => 
        elements.map(el => el.textContent?.trim())
      );
      const extractionsCountHeading = extractionsHeadings.find(text => 
        text?.includes('Recent Extractions')
      );
      
      // If we have extractions, we can't test the empty state without clearing the database
      // But we can still verify the empty state elements exist in the template structure
      const emptyStateExists = await page.$('.px-6.py-12.text-center h3') !== null;
      const tableExists = await page.$('table') !== null;
      
      if (extractionsCountHeading?.includes('(0)')) {
        // We have no extractions, perfect for testing empty state
        expect(emptyStateExists).toBe(true);
        expect(tableExists).toBe(false);
        
        // Check empty state content
        const emptyStateHeading = await page.$eval('.px-6.py-12.text-center h3', el => el.textContent);
        expect(emptyStateHeading?.trim()).toBe('No extractions yet');
        
        const emptyStateMessage = await page.$eval('.px-6.py-12.text-center p', el => el.textContent);
        expect(emptyStateMessage?.trim()).toBe('Upload a document above to get started.');
        
        // Check that the SVG icon is present
        const svgIcon = await page.$('.px-6.py-12.text-center svg');
        expect(svgIcon).toBeTruthy();
      } else {
        // We have extractions, so table should exist and empty state should not
        expect(tableExists).toBe(true);
        expect(emptyStateExists).toBe(false);
        
        // Verify table structure exists
        const tableHeaders = await page.$$eval('th', elements => 
          elements.map(el => el.textContent?.trim())
        );
        expect(tableHeaders).toContain('File Name');
        expect(tableHeaders).toContain('Status');
        expect(tableHeaders).toContain('Summary');
        expect(tableHeaders).toContain('Created');
      }
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
      const statsGrid = await page.$('.grid.grid-cols-2.md\\:grid-cols-4');
      expect(statsGrid).toBeTruthy();
    });
  });
}); 