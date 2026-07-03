/**
 * Americo Financial - Pending Business & Policy Status Downloader
 * 
 * Navigates the Americo agent portal to download:
 * 1. Pending business (applications in underwriting)
 * 2. Policy status changes (issued, declined, withdrawn)
 * 3. Chargeback/lapse indicators
 * 
 * Portal Navigation: Main Menu → Pending Business
 * Americo offers "Instant Decision" products, so many policies are
 * issued immediately, but some go through traditional underwriting.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login } from './login.js';

dotenv.config();

const CONFIG = {
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads/pending'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  portalUrl: 'https://portal.americoagent.com',
};

/**
 * Navigate to the Pending Business section
 */
async function navigateToPending(page) {
  console.log('[AMERICO-PEND] Navigating to Pending Business section...');
  
  const pendingLink = page.locator(
    'a:has-text("Pending"), ' +
    'a:has-text("Pending Business"), ' +
    'nav a:has-text("Pending"), ' +
    '[class*="menu"] a:has-text("Pending"), ' +
    'a[href*="pending" i], ' +
    'a[href*="Pending"]'
  ).first();
  
  if (await pendingLink.isVisible().catch(() => false)) {
    await pendingLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('[AMERICO-PEND] Navigated to Pending Business');
  } else {
    const urls = [
      `${CONFIG.portalUrl}/Pending`,
      `${CONFIG.portalUrl}/pending`,
      `${CONFIG.portalUrl}/PendingBusiness`,
      `${CONFIG.portalUrl}/Business/Pending`,
    ];
    
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const hasContent = await page.locator('text=Pending, text=Application, text=Status').first().isVisible().catch(() => false);
        if (hasContent) {
          console.log('[AMERICO-PEND] Navigated via URL:', url);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
}

/**
 * Scrape pending business data from tables
 */
async function scrapePendingBusiness(page) {
  console.log('[AMERICO-PEND] Scraping pending business data...');
  
  const pendingCases = [];
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
  if (tableCount > 0) {
    console.log(`[AMERICO-PEND] Found ${tableCount} tables`);
    
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
          const record = { _source: 'pending_table' };
          headers.forEach((header, idx) => {
            record[header.trim()] = cells[idx]?.trim() || '';
          });
          pendingCases.push(record);
        }
      }
    }
  } else {
    // Look for list/card-based pending items
    const pendingItems = page.locator(
      '[class*="pending"], ' +
      '[class*="case"], ' +
      '[class*="application"], ' +
      'tr, li'
    );
    
    const itemCount = await pendingItems.count();
    for (let i = 0; i < Math.min(itemCount, 100); i++) {
      const item = pendingItems.nth(i);
      const text = await item.textContent();
      if (text && text.trim().length > 5) {
        pendingCases.push({ raw: text.trim(), index: i, _source: 'pending_list' });
      }
    }
  }
  
  console.log(`[AMERICO-PEND] Found ${pendingCases.length} pending cases`);
  return pendingCases;
}

/**
 * Look for status filters and scrape by status
 */
async function scrapeByStatus(page) {
  console.log('[AMERICO-PEND] Looking for status-based filtering...');
  
  const statusResults = {};
  const statuses = ['Issued', 'Declined', 'Withdrawn', 'In Force', 'Lapsed', 'Cancelled'];
  
  for (const status of statuses) {
    // Look for status filter options
    const statusOption = page.locator(
      `select option:has-text("${status}"), ` +
      `button:has-text("${status}"), ` +
      `a:has-text("${status}"), ` +
      `[role="tab"]:has-text("${status}"), ` +
      `label:has-text("${status}")`
    ).first();
    
    if (await statusOption.isVisible().catch(() => false)) {
      try {
        await statusOption.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        
        // Scrape the filtered results
        const tables = page.locator('table');
        const tableCount = await tables.count();
        const items = [];
        
        if (tableCount > 0) {
          const table = tables.first();
          const rows = table.locator('tr');
          const rowCount = await rows.count();
          
          const headerRow = rows.first();
          const headers = await headerRow.locator('th, td').allTextContents();
          
          for (let r = 1; r < Math.min(rowCount, 50); r++) {
            const row = rows.nth(r);
            const cells = await row.locator('td').allTextContents();
            if (cells.length > 0) {
              const record = {};
              headers.forEach((h, idx) => {
                record[h.trim()] = cells[idx]?.trim() || '';
              });
              items.push(record);
            }
          }
        }
        
        if (items.length > 0) {
          statusResults[status] = items;
          console.log(`[AMERICO-PEND] Found ${items.length} items with status: ${status}`);
        }
      } catch (e) {
        // Status filter didn't work
      }
    }
  }
  
  return statusResults;
}

/**
 * Look for chargebacks in commission transactions
 * Chargebacks in Americo typically show as negative commission entries
 */
async function detectChargebacks(page) {
  console.log('[AMERICO-PEND] Checking for chargebacks/adjustments...');
  
  // Navigate to commissions to look for negative entries
  const commissionsLink = page.locator(
    'a:has-text("Commissions"), a:has-text("Commission")'
  ).first();
  
  const chargebacks = [];
  
  if (await commissionsLink.isVisible().catch(() => false)) {
    await commissionsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for transactions tab
    const txLink = page.locator('a:has-text("Transactions"), button:has-text("Transactions")').first();
    if (await txLink.isVisible().catch(() => false)) {
      await txLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    // Look for negative amounts or chargeback indicators
    const negativeRows = page.locator(
      'td:has-text("-$"), ' +
      'td:has-text("Chargeback"), ' +
      'td:has-text("Charge Back"), ' +
      'td:has-text("Reversal"), ' +
      'td:has-text("Debit"), ' +
      'td:has-text("Adjustment")'
    );
    
    const count = await negativeRows.count();
    for (let i = 0; i < Math.min(count, 50); i++) {
      const cell = negativeRows.nth(i);
      const row = cell.locator('..');
      const rowText = await row.textContent();
      chargebacks.push({
        indicator: await cell.textContent(),
        context: rowText?.trim().substring(0, 300),
      });
    }
  }
  
  console.log(`[AMERICO-PEND] Found ${chargebacks.length} chargeback indicators`);
  return chargebacks;
}

/**
 * Download any export/PDF reports available
 */
async function downloadReports(page) {
  console.log('[AMERICO-PEND] Looking for downloadable reports...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  const downloadLinks = page.locator(
    'a:has-text("Export"), ' +
    'a:has-text("Download"), ' +
    'button:has-text("Export"), ' +
    'button:has-text("Download"), ' +
    'a[href*=".pdf"], ' +
    'a[href*="export" i], ' +
    'a[href*="download" i]'
  );
  
  const count = await downloadLinks.count();
  const files = [];
  
  for (let i = 0; i < Math.min(count, 5); i++) {
    try {
      const link = downloadLinks.nth(i);
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        link.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || `americo-report-${i}-${Date.now()}.pdf`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        files.push(filePath);
        console.log(`[AMERICO-PEND] Downloaded: ${filename}`);
      }
      
      await page.waitForTimeout(1000);
    } catch (e) {
      // Continue
    }
  }
  
  return files;
}

/**
 * Main execution
 */
export async function downloadPendingData() {
  let browser;
  
  try {
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Navigate to pending business
    await navigateToPending(page);
    
    // Scrape pending cases
    const pendingCases = await scrapePendingBusiness(page);
    
    // Try status-based filtering
    const statusData = await scrapeByStatus(page);
    
    // Detect chargebacks
    const chargebacks = await detectChargebacks(page);
    
    // Download reports
    const reportFiles = await downloadReports(page);
    
    // Save data
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (pendingCases.length > 0) {
      const pendPath = path.join(CONFIG.downloadDir, `pending-cases-${timestamp}.json`);
      fs.writeFileSync(pendPath, JSON.stringify(pendingCases, null, 2));
    }
    
    if (Object.keys(statusData).length > 0) {
      const statusPath = path.join(CONFIG.downloadDir, `status-data-${timestamp}.json`);
      fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
    }
    
    if (chargebacks.length > 0) {
      const cbPath = path.join(CONFIG.downloadDir, `chargebacks-${timestamp}.json`);
      fs.writeFileSync(cbPath, JSON.stringify(chargebacks, null, 2));
    }
    
    // Summary
    console.log('\n[AMERICO-PEND] ═══════════════════════════════════════');
    console.log('[AMERICO-PEND] Pending Business Summary:');
    console.log(`[AMERICO-PEND]   Pending Cases: ${pendingCases.length}`);
    console.log(`[AMERICO-PEND]   Status Categories: ${Object.keys(statusData).length}`);
    console.log(`[AMERICO-PEND]   Chargebacks: ${chargebacks.length}`);
    console.log(`[AMERICO-PEND]   Report Files: ${reportFiles.length}`);
    console.log('[AMERICO-PEND] ═══════════════════════════════════════');
    
    await browser.close();
    return { pendingCases, statusData, chargebacks, reportFiles };
    
  } catch (error) {
    console.error('[AMERICO-PEND] Fatal error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('download-pending.js')) {
  try {
    await downloadPendingData();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
