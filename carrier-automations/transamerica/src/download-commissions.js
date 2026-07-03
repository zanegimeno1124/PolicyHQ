/**
 * TransAmerica - Commission Statement Downloader
 * 
 * Downloads commission data from TransAmerica portals:
 * 1. Monthly commission statements (PDF)
 * 2. Earned commission summaries
 * 3. Commission transaction detail
 * 4. Agent Detail reports (per agent number)
 * 
 * TransAmerica provides:
 * - Quick summary of earned commissions with monthly totals
 * - Agent Detail button generates one PDF for all agent numbers
 * - Monthly commission statements available online
 * 
 * Works with TransACT, Agent Home, or TLIC portals.
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
};

/**
 * Navigate to the Commissions section
 */
async function navigateToCommissions(page, portal) {
  console.log('[TA-COMM] Navigating to Commissions section...');
  
  // Try common navigation patterns
  const commissionsLink = page.locator(
    'a:has-text("Commission"), ' +
    'a:has-text("Commissions"), ' +
    'a:has-text("Earned Commission"), ' +
    'nav a:has-text("Commission"), ' +
    '[class*="menu"] a:has-text("Commission"), ' +
    '[class*="nav"] a:has-text("Commission"), ' +
    'a[href*="commission" i], ' +
    'a[href*="Commission"]'
  ).first();
  
  if (await commissionsLink.isVisible().catch(() => false)) {
    await commissionsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('[TA-COMM] Navigated to Commissions section');
    return true;
  }
  
  // Try menu hover/expand patterns (TransACT uses nested menus)
  const menuItems = page.locator(
    'li:has-text("Commission"), ' +
    '[class*="menu-item"]:has-text("Commission"), ' +
    '[role="menuitem"]:has-text("Commission")'
  ).first();
  
  if (await menuItems.isVisible().catch(() => false)) {
    await menuItems.hover();
    await page.waitForTimeout(1000);
    
    const subLink = page.locator(
      'a:has-text("Commission Statement"), ' +
      'a:has-text("Earned Commission"), ' +
      'a:has-text("View Commission")'
    ).first();
    
    if (await subLink.isVisible().catch(() => false)) {
      await subLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      return true;
    }
  }
  
  // Fallback: try direct URL patterns based on portal
  const urls = {
    transact: [
      'https://transact.transamerica.com/commission/',
      'https://transact.transamerica.com/commissions/',
      'https://transact.transamerica.com/producer/commissions',
    ],
    agent_home: [
      'https://www.transamerica.com/financial-pro/commissions',
    ],
    tlic: [
      'https://tlic.transamerica.com/portal/public/tlc/commissions',
    ],
  };
  
  for (const url of (urls[portal] || urls.transact)) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      const hasContent = await page.locator('text=Commission').first().isVisible().catch(() => false);
      if (hasContent && !page.url().includes('login')) {
        console.log('[TA-COMM] Navigated via URL:', url);
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  
  console.warn('[TA-COMM] Could not navigate to Commissions section directly');
  return false;
}

/**
 * Download commission statement PDFs
 */
async function downloadStatementPDFs(page) {
  console.log('[TA-COMM] Looking for commission statement PDFs...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  const downloadedFiles = [];
  
  // Look for statement links (PDF downloads)
  const statementLinks = page.locator(
    'a[href*="statement" i], ' +
    'a[href*=".pdf"], ' +
    'a:has-text("Statement"), ' +
    'a:has-text("Download"), ' +
    'a:has-text("View Statement"), ' +
    'button:has-text("Agent Detail"), ' +
    'button:has-text("Download"), ' +
    'input[value*="Agent Detail"]'
  );
  
  const count = await statementLinks.count();
  console.log(`[TA-COMM] Found ${count} potential statement links`);
  
  for (let i = 0; i < Math.min(count, 6); i++) {
    try {
      const link = statementLinks.nth(i);
      const text = await link.textContent().catch(() => '');
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
        link.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || `ta-commission-${i}-${Date.now()}.pdf`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
        console.log(`[TA-COMM] Downloaded: ${filename}`);
      } else {
        // Check if a new tab/window opened with PDF
        const pages = page.context().pages();
        if (pages.length > 1) {
          const newPage = pages[pages.length - 1];
          const newUrl = newPage.url();
          if (newUrl.includes('.pdf') || newUrl.includes('commission')) {
            console.log(`[TA-COMM] Statement opened in new tab: ${newUrl}`);
          }
          await newPage.close();
        }
      }
      
      await page.waitForTimeout(1500);
    } catch (error) {
      console.warn(`[TA-COMM] Failed to download statement ${i}:`, error.message);
    }
  }
  
  return downloadedFiles;
}

/**
 * Scrape commission summary data from the page
 */
async function scrapeCommissionSummary(page) {
  console.log('[TA-COMM] Scraping commission summary data...');
  
  const summaryData = [];
  
  // Look for month selector/dropdown to get historical data
  const monthSelector = page.locator(
    'select[name*="month" i], select[name*="period" i], select[id*="month" i]'
  ).first();
  
  if (await monthSelector.isVisible().catch(() => false)) {
    // Get available months
    const options = await monthSelector.locator('option').allTextContents();
    console.log(`[TA-COMM] Found ${options.length} month options`);
    
    // Select last 3 months
    for (let i = 0; i < Math.min(options.length, 3); i++) {
      await monthSelector.selectOption({ index: i });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Scrape the displayed data
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
            const record = { _period: options[i] };
            headers.forEach((header, idx) => {
              record[header.trim()] = cells[idx]?.trim() || '';
            });
            summaryData.push(record);
          }
        }
      }
    }
  } else {
    // Scrape whatever tables are visible
    const tables = page.locator('table');
    const tableCount = await tables.count();
    
    for (let t = 0; t < tableCount; t++) {
      const table = tables.nth(t);
      const rows = table.locator('tr');
      const rowCount = await rows.count();
      
      const headerRow = rows.first();
      const headers = await headerRow.locator('th, td').allTextContents();
      
      for (let r = 1; r < Math.min(rowCount, 100); r++) {
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
  }
  
  return summaryData;
}

/**
 * Look for and download export/CSV options
 */
async function downloadExports(page) {
  console.log('[TA-COMM] Looking for export options...');
  
  const exportButtons = page.locator(
    'button:has-text("Export"), ' +
    'a:has-text("Export"), ' +
    'button:has-text("CSV"), ' +
    'a:has-text("CSV"), ' +
    'button:has-text("Excel"), ' +
    'a:has-text("Excel"), ' +
    'input[value*="Export" i]'
  );
  
  const count = await exportButtons.count();
  const exportFiles = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const btn = exportButtons.nth(i);
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        btn.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || `ta-export-${i}-${Date.now()}.csv`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        exportFiles.push(filePath);
        console.log(`[TA-COMM] Exported: ${filename}`);
      }
      
      await page.waitForTimeout(1000);
    } catch (e) {
      // Continue
    }
  }
  
  return exportFiles;
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
    const portal = session.portal;
    
    // Navigate to commissions
    await navigateToCommissions(page, portal);
    
    // Scrape summary
    const summary = await scrapeCommissionSummary(page);
    
    // Download PDFs
    const statementFiles = await downloadStatementPDFs(page);
    
    // Download exports
    const exportFiles = await downloadExports(page);
    
    // Save scraped data
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (summary.length > 0) {
      const summaryPath = path.join(CONFIG.downloadDir, `commission-summary-${timestamp}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`[TA-COMM] Saved ${summary.length} summary records`);
    }
    
    // Summary
    console.log('\n[TA-COMM] ═══════════════════════════════════════');
    console.log('[TA-COMM] Commission Download Summary:');
    console.log(`[TA-COMM]   Summary Records: ${summary.length}`);
    console.log(`[TA-COMM]   Statement PDFs: ${statementFiles.length}`);
    console.log(`[TA-COMM]   Export Files: ${exportFiles.length}`);
    console.log('[TA-COMM] ═══════════════════════════════════════');
    
    await browser.close();
    return { summary, statementFiles, exportFiles };
    
  } catch (error) {
    console.error('[TA-COMM] Fatal error:', error.message);
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
