/**
 * Americo Financial - Commission Statement Downloader
 * 
 * Navigates the Americo agent portal to download commission data:
 * 1. Commission summary (overview of all commissions)
 * 2. Commission statements (detailed monthly/weekly statements)
 * 3. Commission transactions (individual transaction records)
 * 4. 1099 statements (available in January)
 * 
 * Portal Navigation: Main Menu → Commissions
 * The portal shows a commission snapshot on the home page, with full details
 * under the Commissions menu item.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login } from './login.js';

dotenv.config();

const CONFIG = {
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads/commissions'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  portalUrl: 'https://portal.americoagent.com',
};

/**
 * Navigate to the Commissions section
 */
async function navigateToCommissions(page) {
  console.log('[AMERICO-COMM] Navigating to Commissions section...');
  
  const commissionsLink = page.locator(
    'a:has-text("Commissions"), ' +
    'a:has-text("Commission"), ' +
    'nav a:has-text("Commission"), ' +
    '[class*="menu"] a:has-text("Commission"), ' +
    'a[href*="commission" i], ' +
    'a[href*="Commission"]'
  ).first();
  
  if (await commissionsLink.isVisible().catch(() => false)) {
    await commissionsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('[AMERICO-COMM] Navigated to Commissions section');
  } else {
    // Try direct URL patterns
    const urls = [
      `${CONFIG.portalUrl}/Commissions`,
      `${CONFIG.portalUrl}/commissions`,
      `${CONFIG.portalUrl}/Commission/Summary`,
      `${CONFIG.portalUrl}/Commission/Statements`,
    ];
    
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const hasContent = await page.locator('text=Commission, text=Statement').first().isVisible().catch(() => false);
        if (hasContent) {
          console.log('[AMERICO-COMM] Navigated via URL:', url);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
}

/**
 * Download commission summary report
 */
async function downloadCommissionSummary(page) {
  console.log('[AMERICO-COMM] Looking for commission summary...');
  
  // Look for Summary tab/link within commissions section
  const summaryLink = page.locator(
    'a:has-text("Summary"), ' +
    'button:has-text("Summary"), ' +
    '[role="tab"]:has-text("Summary")'
  ).first();
  
  if (await summaryLink.isVisible().catch(() => false)) {
    await summaryLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  
  // Scrape summary data from tables
  const summaryData = [];
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
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
        summaryData.push(record);
      }
    }
  }
  
  return summaryData;
}

/**
 * Download commission statements (PDFs or data)
 */
async function downloadStatements(page) {
  console.log('[AMERICO-COMM] Looking for commission statements...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  // Navigate to Statements tab
  const statementsLink = page.locator(
    'a:has-text("Statements"), ' +
    'a:has-text("Statement"), ' +
    'button:has-text("Statements"), ' +
    '[role="tab"]:has-text("Statements")'
  ).first();
  
  if (await statementsLink.isVisible().catch(() => false)) {
    await statementsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  
  const downloadedFiles = [];
  
  // Look for downloadable statement links (typically PDFs)
  const statementLinks = page.locator(
    'a[href*="statement" i], ' +
    'a[href*="Statement"], ' +
    'a[href*=".pdf"], ' +
    'a:has-text("Download"), ' +
    'a:has-text("View Statement"), ' +
    'a:has-text("PDF"), ' +
    'button:has-text("Download"), ' +
    'button:has-text("Export")'
  );
  
  const count = await statementLinks.count();
  console.log(`[AMERICO-COMM] Found ${count} statement links`);
  
  // Download the most recent statements (limit to last 3 months)
  for (let i = 0; i < Math.min(count, 6); i++) {
    try {
      const link = statementLinks.nth(i);
      const text = await link.textContent();
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        link.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || `americo-statement-${i}-${Date.now()}.pdf`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
        console.log(`[AMERICO-COMM] Downloaded: ${filename}`);
      } else {
        // May have opened in a new tab or displayed inline
        // Check if a new page opened
        const pages = page.context().pages();
        if (pages.length > 1) {
          const newPage = pages[pages.length - 1];
          // If it's a PDF, save it
          const newUrl = newPage.url();
          if (newUrl.includes('.pdf') || newUrl.includes('statement')) {
            console.log(`[AMERICO-COMM] Statement opened in new tab: ${newUrl}`);
          }
          await newPage.close();
        }
      }
      
      await page.waitForTimeout(1500);
    } catch (error) {
      console.warn(`[AMERICO-COMM] Failed to download statement ${i}:`, error.message);
    }
  }
  
  return downloadedFiles;
}

/**
 * Download commission transactions (detailed line items)
 */
async function downloadTransactions(page) {
  console.log('[AMERICO-COMM] Looking for commission transactions...');
  
  // Navigate to Transactions tab
  const transactionsLink = page.locator(
    'a:has-text("Transactions"), ' +
    'a:has-text("Transaction"), ' +
    'button:has-text("Transactions"), ' +
    '[role="tab"]:has-text("Transactions")'
  ).first();
  
  if (await transactionsLink.isVisible().catch(() => false)) {
    await transactionsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  
  // Scrape transaction data
  const transactions = [];
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
  for (let t = 0; t < tableCount; t++) {
    const table = tables.nth(t);
    const rows = table.locator('tr');
    const rowCount = await rows.count();
    
    const headerRow = rows.first();
    const headers = await headerRow.locator('th, td').allTextContents();
    
    for (let r = 1; r < Math.min(rowCount, 200); r++) {
      const row = rows.nth(r);
      const cells = await row.locator('td').allTextContents();
      
      if (cells.length > 0) {
        const record = {};
        headers.forEach((header, idx) => {
          record[header.trim()] = cells[idx]?.trim() || '';
        });
        transactions.push(record);
      }
    }
  }
  
  // Also look for export/download button for transactions
  const exportBtn = page.locator(
    'button:has-text("Export"), a:has-text("Export"), button:has-text("Download"), a:has-text("CSV")'
  ).first();
  
  let exportFile = null;
  if (await exportBtn.isVisible().catch(() => false)) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
      exportBtn.click(),
    ]);
    
    if (download) {
      const filename = download.suggestedFilename() || `americo-transactions-${Date.now()}.csv`;
      const filePath = path.join(CONFIG.downloadDir, filename);
      await download.saveAs(filePath);
      exportFile = filePath;
      console.log(`[AMERICO-COMM] Exported transactions: ${filename}`);
    }
  }
  
  return { transactions, exportFile };
}

/**
 * Scrape the home page commission snapshot
 */
async function scrapeHomePageSnapshot(page) {
  console.log('[AMERICO-COMM] Scraping home page commission snapshot...');
  
  await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Look for commission-related content on home page
  const snapshot = {};
  
  const commissionElements = page.locator(
    '[class*="commission" i], ' +
    '[class*="earning" i], ' +
    '[class*="balance" i], ' +
    '[class*="snapshot" i], ' +
    '[class*="summary" i]'
  );
  
  const count = await commissionElements.count();
  for (let i = 0; i < count; i++) {
    const el = commissionElements.nth(i);
    const text = await el.textContent();
    snapshot[`element_${i}`] = text?.trim();
  }
  
  return snapshot;
}

/**
 * Main execution
 */
export async function downloadAllCommissions() {
  let browser;
  
  try {
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Scrape home page snapshot first
    const homeSnapshot = await scrapeHomePageSnapshot(page);
    
    // Navigate to commissions
    await navigateToCommissions(page);
    
    // Download summary
    const summary = await downloadCommissionSummary(page);
    
    // Download statements
    const statementFiles = await downloadStatements(page);
    
    // Download transactions
    const { transactions, exportFile } = await downloadTransactions(page);
    
    // Save data
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (Object.keys(homeSnapshot).length > 0) {
      const snapPath = path.join(CONFIG.downloadDir, `home-snapshot-${timestamp}.json`);
      fs.writeFileSync(snapPath, JSON.stringify(homeSnapshot, null, 2));
    }
    
    if (summary.length > 0) {
      const summaryPath = path.join(CONFIG.downloadDir, `commission-summary-${timestamp}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`[AMERICO-COMM] Saved ${summary.length} summary records`);
    }
    
    if (transactions.length > 0) {
      const txPath = path.join(CONFIG.downloadDir, `transactions-${timestamp}.json`);
      fs.writeFileSync(txPath, JSON.stringify(transactions, null, 2));
      console.log(`[AMERICO-COMM] Saved ${transactions.length} transaction records`);
    }
    
    // Summary
    console.log('\n[AMERICO-COMM] ═══════════════════════════════════════');
    console.log('[AMERICO-COMM] Commission Download Summary:');
    console.log(`[AMERICO-COMM]   Summary Records: ${summary.length}`);
    console.log(`[AMERICO-COMM]   Statement Files: ${statementFiles.length}`);
    console.log(`[AMERICO-COMM]   Transactions: ${transactions.length}`);
    console.log(`[AMERICO-COMM]   Export File: ${exportFile ? 'Yes' : 'No'}`);
    console.log('[AMERICO-COMM] ═══════════════════════════════════════');
    
    await browser.close();
    return { summary, statementFiles, transactions, exportFile };
    
  } catch (error) {
    console.error('[AMERICO-COMM] Fatal error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('download-commissions.js')) {
  try {
    await downloadAllCommissions();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
