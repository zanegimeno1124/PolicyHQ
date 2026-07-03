/**
 * Ethos Life - Customer & Policy Status Downloader
 * 
 * Navigates the Ethos agent portal to the Customers section and downloads:
 * 1. Customer list with policy statuses (pending, active, lapsed)
 * 2. Application status updates
 * 3. Policy activation/cancellation events
 * 
 * Portal Navigation: Sidebar → Customers
 * Ethos provides instant decisions for 90% of applicants, so status changes
 * happen quickly and need frequent monitoring.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login } from './login.js';

dotenv.config();

const CONFIG = {
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads/customers'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
};

/**
 * Navigate to the Customers section of the portal
 */
async function navigateToCustomers(page) {
  console.log('[ETHOS-CUST] Navigating to Customers section...');
  
  const customersLink = page.locator(
    'a:has-text("Customers"), ' +
    'nav a:has-text("Customers"), ' +
    '[role="navigation"] a:has-text("Customers"), ' +
    'a[href*="customer"], ' +
    'a[href*="client"], ' +
    'button:has-text("Customers"), ' +
    'span:has-text("Customers")'
  ).first();
  
  if (await customersLink.isVisible().catch(() => false)) {
    await customersLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('[ETHOS-CUST] Navigated to Customers section');
  } else {
    const urls = [
      'https://app.ethos.com/agent/customers',
      'https://app.ethos.com/customers',
      'https://agents.ethoslife.com/customers',
    ];
    
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        if (!page.url().includes('login')) {
          console.log('[ETHOS-CUST] Navigated via URL:', url);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
}

/**
 * Intercept API calls to capture customer/policy data
 */
async function captureCustomerAPI(page) {
  console.log('[ETHOS-CUST] Setting up API interception for customer data...');
  
  const apiResponses = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (
      url.includes('customer') || 
      url.includes('client') || 
      url.includes('policy') ||
      url.includes('application') ||
      url.includes('case')
    ) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const data = await response.json();
          apiResponses.push({ url, data, timestamp: Date.now() });
          console.log(`[ETHOS-CUST] Captured API response from: ${url}`);
        }
      } catch (e) {
        // Not JSON
      }
    }
  });
  
  await navigateToCustomers(page);
  await page.waitForTimeout(5000);
  
  return apiResponses;
}

/**
 * Scrape customer list data from the page
 */
async function scrapeCustomerList(page) {
  console.log('[ETHOS-CUST] Scraping customer list...');
  
  const customers = [];
  
  // Look for customer table
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
  if (tableCount > 0) {
    for (let t = 0; t < tableCount; t++) {
      const table = tables.nth(t);
      const rows = table.locator('tr');
      const rowCount = await rows.count();
      
      const headerRow = rows.first();
      const headers = await headerRow.locator('th, td').allTextContents();
      
      for (let r = 1; r < rowCount; r++) {
        const row = rows.nth(r);
        const cells = await row.locator('td').allTextContents();
        
        if (cells.length > 0) {
          const record = {};
          headers.forEach((header, idx) => {
            record[header.trim()] = cells[idx]?.trim() || '';
          });
          customers.push(record);
        }
      }
    }
  } else {
    // Modern card/list UI
    const customerItems = page.locator(
      '[class*="customer"], ' +
      '[class*="client"], ' +
      '[data-testid*="customer"], ' +
      '[class*="policy-card"], ' +
      '[class*="application-row"]'
    );
    
    const itemCount = await customerItems.count();
    console.log(`[ETHOS-CUST] Found ${itemCount} customer items`);
    
    for (let i = 0; i < Math.min(itemCount, 200); i++) {
      const item = customerItems.nth(i);
      const text = await item.textContent();
      customers.push({ raw: text?.trim(), index: i });
    }
  }
  
  return customers;
}

/**
 * Filter customers by status to find recent changes
 */
async function filterByStatus(page, status) {
  console.log(`[ETHOS-CUST] Filtering by status: ${status}...`);
  
  // Look for status filter/tabs
  const statusFilter = page.locator(
    `button:has-text("${status}"), ` +
    `a:has-text("${status}"), ` +
    `[role="tab"]:has-text("${status}"), ` +
    `option:has-text("${status}")`
  ).first();
  
  if (await statusFilter.isVisible().catch(() => false)) {
    await statusFilter.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    return true;
  }
  
  return false;
}

/**
 * Scrape policy status details for chargebacks and lapses
 */
async function scrapeStatusChanges(page) {
  console.log('[ETHOS-CUST] Looking for status changes and chargebacks...');
  
  const statusChanges = [];
  const statuses = ['Lapsed', 'Cancelled', 'Declined', 'Pending', 'Active'];
  
  for (const status of statuses) {
    const filtered = await filterByStatus(page, status);
    if (filtered) {
      const items = await scrapeCustomerList(page);
      statusChanges.push({
        status,
        count: items.length,
        items: items.slice(0, 50), // Limit to 50 per status
      });
      console.log(`[ETHOS-CUST] Found ${items.length} items with status: ${status}`);
    }
  }
  
  return statusChanges;
}

/**
 * Download any available exports from the customers section
 */
async function downloadExports(page) {
  console.log('[ETHOS-CUST] Looking for export/download options...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  const exportButtons = page.locator(
    'button:has-text("Export"), ' +
    'button:has-text("Download"), ' +
    'a:has-text("Export"), ' +
    'a:has-text("Download"), ' +
    'a[href*="export"], ' +
    'button:has-text("CSV")'
  );
  
  const count = await exportButtons.count();
  const downloadedFiles = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const button = exportButtons.nth(i);
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        button.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || `ethos-customers-${Date.now()}.csv`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
        console.log(`[ETHOS-CUST] Downloaded: ${filename}`);
      }
      
      await page.waitForTimeout(1000);
    } catch (error) {
      // Continue
    }
  }
  
  return downloadedFiles;
}

/**
 * Main execution
 */
export async function downloadCustomerData() {
  let browser;
  
  try {
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Capture API responses
    const apiData = await captureCustomerAPI(page);
    
    // Scrape customer list
    const customers = await scrapeCustomerList(page);
    
    // Get status-filtered data
    const statusChanges = await scrapeStatusChanges(page);
    
    // Download exports
    const downloadedFiles = await downloadExports(page);
    
    // Save data
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (apiData.length > 0) {
      const apiPath = path.join(CONFIG.downloadDir, `api-customers-${timestamp}.json`);
      fs.writeFileSync(apiPath, JSON.stringify(apiData, null, 2));
      console.log(`[ETHOS-CUST] Saved ${apiData.length} API responses`);
    }
    
    if (customers.length > 0) {
      const custPath = path.join(CONFIG.downloadDir, `customers-${timestamp}.json`);
      fs.writeFileSync(custPath, JSON.stringify(customers, null, 2));
      console.log(`[ETHOS-CUST] Saved ${customers.length} customer records`);
    }
    
    if (statusChanges.length > 0) {
      const statusPath = path.join(CONFIG.downloadDir, `status-changes-${timestamp}.json`);
      fs.writeFileSync(statusPath, JSON.stringify(statusChanges, null, 2));
      console.log(`[ETHOS-CUST] Saved status change data`);
    }
    
    // Summary
    console.log('\n[ETHOS-CUST] ═══════════════════════════════════════');
    console.log('[ETHOS-CUST] Download Summary:');
    console.log(`[ETHOS-CUST]   API Responses: ${apiData.length}`);
    console.log(`[ETHOS-CUST]   Customer Records: ${customers.length}`);
    console.log(`[ETHOS-CUST]   Status Categories: ${statusChanges.length}`);
    console.log(`[ETHOS-CUST]   Downloaded Files: ${downloadedFiles.length}`);
    console.log('[ETHOS-CUST] ═══════════════════════════════════════');
    
    await browser.close();
    return { apiData, customers, statusChanges, downloadedFiles };
    
  } catch (error) {
    console.error('[ETHOS-CUST] Fatal error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('download-customers.js')) {
  try {
    await downloadCustomerData();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
