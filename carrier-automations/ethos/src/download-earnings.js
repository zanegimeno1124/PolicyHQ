/**
 * Ethos Life - Earnings & Commission Data Downloader
 * 
 * Navigates the Ethos agent portal to the Earnings section and downloads:
 * 1. Commission statements (weekly payments for activated policies)
 * 2. Bonus/referral payments (monthly)
 * 3. Chargeback/adjustment records
 * 
 * Portal Navigation: Sidebar → Earnings
 * Ethos pays commissions "as earned" - weekly for activated policies
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login } from './login.js';

dotenv.config();

const CONFIG = {
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads/earnings'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
};

/**
 * Navigate to the Earnings section of the portal
 */
async function navigateToEarnings(page) {
  console.log('[ETHOS-EARN] Navigating to Earnings section...');
  
  // Ethos portal sidebar navigation
  const earningsLink = page.locator(
    'a:has-text("Earnings"), ' +
    'nav a:has-text("Earnings"), ' +
    '[role="navigation"] a:has-text("Earnings"), ' +
    'a[href*="earnings"], ' +
    'a[href*="compensation"], ' +
    'button:has-text("Earnings"), ' +
    'span:has-text("Earnings")'
  ).first();
  
  if (await earningsLink.isVisible().catch(() => false)) {
    await earningsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for React to render
    console.log('[ETHOS-EARN] Navigated to Earnings section');
  } else {
    // Try URL-based navigation
    const earningsUrls = [
      'https://app.ethos.com/agent/earnings',
      'https://app.ethos.com/earnings',
      'https://agents.ethoslife.com/earnings',
    ];
    
    for (const url of earningsUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        if (!page.url().includes('login')) {
          console.log('[ETHOS-EARN] Navigated via URL:', url);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
}

/**
 * Scrape earnings/commission data from the Earnings page
 * Ethos likely shows a list of transactions with dates, amounts, and policy info
 */
async function scrapeEarningsData(page) {
  console.log('[ETHOS-EARN] Scraping earnings data...');
  
  // Wait for earnings content to load
  await page.waitForTimeout(3000);
  
  const earnings = [];
  
  // Look for a table or list of earnings/transactions
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
  if (tableCount > 0) {
    console.log(`[ETHOS-EARN] Found ${tableCount} tables`);
    
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
          earnings.push(record);
        }
      }
    }
  } else {
    // Ethos may use card-based or list-based UI instead of tables
    console.log('[ETHOS-EARN] No tables found, looking for list/card-based earnings...');
    
    // Look for transaction items (common patterns in modern UIs)
    const transactionItems = page.locator(
      '[class*="transaction"], ' +
      '[class*="earning"], ' +
      '[class*="payment"], ' +
      '[class*="commission"], ' +
      '[data-testid*="earning"], ' +
      '[data-testid*="transaction"], ' +
      'li:has([class*="amount"]), ' +
      'div[class*="row"]:has([class*="amount"])'
    );
    
    const itemCount = await transactionItems.count();
    console.log(`[ETHOS-EARN] Found ${itemCount} transaction items`);
    
    for (let i = 0; i < Math.min(itemCount, 100); i++) {
      const item = transactionItems.nth(i);
      const text = await item.textContent();
      earnings.push({ raw: text?.trim(), index: i });
    }
  }
  
  // Also try to intercept API calls for structured data
  // Ethos likely fetches earnings from an API endpoint
  
  return earnings;
}

/**
 * Intercept network requests to capture the earnings API response
 * This gives us structured JSON data instead of scraping HTML
 */
async function captureEarningsAPI(page) {
  console.log('[ETHOS-EARN] Setting up API interception...');
  
  const apiResponses = [];
  
  // Listen for API responses that contain earnings/commission data
  page.on('response', async (response) => {
    const url = response.url();
    if (
      url.includes('earning') || 
      url.includes('commission') || 
      url.includes('compensation') ||
      url.includes('payment') ||
      url.includes('transaction')
    ) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json')) {
          const data = await response.json();
          apiResponses.push({ url, data, timestamp: Date.now() });
          console.log(`[ETHOS-EARN] Captured API response from: ${url}`);
        }
      } catch (e) {
        // Not JSON or failed to parse
      }
    }
  });
  
  // Navigate to earnings to trigger API calls
  await navigateToEarnings(page);
  
  // Wait for API calls to complete
  await page.waitForTimeout(5000);
  
  // Try scrolling to trigger pagination/lazy loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  
  return apiResponses;
}

/**
 * Look for and click any export/download buttons
 */
async function downloadExports(page) {
  console.log('[ETHOS-EARN] Looking for export/download options...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  const exportButtons = page.locator(
    'button:has-text("Export"), ' +
    'button:has-text("Download"), ' +
    'a:has-text("Export"), ' +
    'a:has-text("Download"), ' +
    'a[href*="export"], ' +
    'a[href*="download"], ' +
    'button:has-text("CSV"), ' +
    'a:has-text("CSV")'
  );
  
  const count = await exportButtons.count();
  const downloadedFiles = [];
  
  console.log(`[ETHOS-EARN] Found ${count} export/download buttons`);
  
  for (let i = 0; i < count; i++) {
    try {
      const button = exportButtons.nth(i);
      const text = await button.textContent();
      
      console.log(`[ETHOS-EARN] Clicking: ${text?.trim()}`);
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        button.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || `ethos-earnings-${Date.now()}.csv`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
        console.log(`[ETHOS-EARN] Downloaded: ${filename}`);
      }
      
      await page.waitForTimeout(1000);
    } catch (error) {
      // Continue to next button
    }
  }
  
  return downloadedFiles;
}

/**
 * Set date range filter if available
 */
async function setDateRange(page, startDate, endDate) {
  console.log(`[ETHOS-EARN] Setting date range: ${startDate} to ${endDate}`);
  
  // Look for date picker/filter controls
  const dateFilter = page.locator(
    'input[type="date"], ' +
    'button:has-text("Date"), ' +
    'button:has-text("Filter"), ' +
    '[class*="date-picker"], ' +
    '[class*="datepicker"]'
  ).first();
  
  if (await dateFilter.isVisible().catch(() => false)) {
    // Try to interact with date filter
    await dateFilter.click();
    await page.waitForTimeout(1000);
    
    // Look for start/end date inputs
    const startInput = page.locator('input[name*="start"], input[placeholder*="Start"]').first();
    const endInput = page.locator('input[name*="end"], input[placeholder*="End"]').first();
    
    if (await startInput.isVisible().catch(() => false)) {
      await startInput.fill(startDate);
    }
    if (await endInput.isVisible().catch(() => false)) {
      await endInput.fill(endDate);
    }
    
    // Apply filter
    const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")').first();
    if (await applyButton.isVisible().catch(() => false)) {
      await applyButton.click();
      await page.waitForLoadState('networkidle');
    }
  }
}

/**
 * Main execution
 */
export async function downloadAllEarnings() {
  let browser;
  
  try {
    // Login
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Capture API responses while navigating
    const apiData = await captureEarningsAPI(page);
    
    // Scrape visible earnings data
    const scrapedEarnings = await scrapeEarningsData(page);
    
    // Try to download exports
    const downloadedFiles = await downloadExports(page);
    
    // Save all captured data
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (apiData.length > 0) {
      const apiPath = path.join(CONFIG.downloadDir, `api-earnings-${timestamp}.json`);
      fs.writeFileSync(apiPath, JSON.stringify(apiData, null, 2));
      console.log(`[ETHOS-EARN] Saved ${apiData.length} API responses to: ${apiPath}`);
    }
    
    if (scrapedEarnings.length > 0) {
      const scrapePath = path.join(CONFIG.downloadDir, `scraped-earnings-${timestamp}.json`);
      fs.writeFileSync(scrapePath, JSON.stringify(scrapedEarnings, null, 2));
      console.log(`[ETHOS-EARN] Saved ${scrapedEarnings.length} scraped records to: ${scrapePath}`);
    }
    
    // Summary
    console.log('\n[ETHOS-EARN] ═══════════════════════════════════════');
    console.log('[ETHOS-EARN] Download Summary:');
    console.log(`[ETHOS-EARN]   API Responses Captured: ${apiData.length}`);
    console.log(`[ETHOS-EARN]   Scraped Records: ${scrapedEarnings.length}`);
    console.log(`[ETHOS-EARN]   Downloaded Files: ${downloadedFiles.length}`);
    console.log('[ETHOS-EARN] ═══════════════════════════════════════');
    
    await browser.close();
    return { apiData, scrapedEarnings, downloadedFiles };
    
  } catch (error) {
    console.error('[ETHOS-EARN] Fatal error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('download-earnings.js')) {
  try {
    await downloadAllEarnings();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
