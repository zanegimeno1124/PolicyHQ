/**
 * Mutual of Omaha - Policy Status & Chargeback Report Downloader
 * 
 * Navigates the SPA portal to download:
 * 1. Pending case status reports (applications in underwriting)
 * 2. Policy status changes (issued, declined, withdrawn)
 * 3. Chargeback/lapse notifications
 * 
 * Portal path: My Business section → Pending Cases / Policy Activity
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login } from './login.js';

dotenv.config();

const CONFIG = {
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads/status'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  portalBase: 'https://producer.mutualofomaha.com',
};

/**
 * Navigate to the My Business / Pending Cases section
 */
async function navigateToMyBusiness(page) {
  console.log('[MOO-STATUS] Navigating to My Business section...');
  
  // Try clicking the My Business tab
  const myBusinessLink = page.locator(
    'a:has-text("My Business"), ' +
    'nav a:has-text("My Business"), ' +
    '[role="tab"]:has-text("My Business"), ' +
    'a:has-text("Business")'
  ).first();
  
  if (await myBusinessLink.isVisible().catch(() => false)) {
    await myBusinessLink.click();
    await page.waitForLoadState('networkidle');
    console.log('[MOO-STATUS] Navigated to My Business');
  } else {
    // Try direct URL
    const urls = [
      `${CONFIG.portalBase}/enterprise/portal/home/mybusiness`,
      `${CONFIG.portalBase}/enterprise/myportal#!/my-business`,
      `${CONFIG.portalBase}/enterprise/portal/mybusiness`,
    ];
    
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        if (!page.url().includes('accounts.mutualofomaha.com')) {
          console.log('[MOO-STATUS] Navigated via URL:', url);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
}

/**
 * Extract pending case data from the portal
 * This captures applications currently in underwriting
 */
async function scrapePendingCases(page) {
  console.log('[MOO-STATUS] Looking for pending cases...');
  
  // Look for pending cases table or list
  const pendingSection = page.locator(
    'text=Pending, ' +
    'h2:has-text("Pending"), ' +
    'h3:has-text("Pending"), ' +
    'a:has-text("Pending Cases"), ' +
    'a:has-text("Pending Status")'
  ).first();
  
  if (await pendingSection.isVisible().catch(() => false)) {
    await pendingSection.click().catch(() => {});
    await page.waitForLoadState('networkidle');
  }
  
  // Try to find and extract table data
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
  const cases = [];
  
  if (tableCount > 0) {
    console.log(`[MOO-STATUS] Found ${tableCount} tables on page`);
    
    for (let t = 0; t < tableCount; t++) {
      const table = tables.nth(t);
      const rows = table.locator('tr');
      const rowCount = await rows.count();
      
      // Get headers
      const headerRow = rows.first();
      const headers = await headerRow.locator('th, td').allTextContents();
      
      // Get data rows
      for (let r = 1; r < rowCount; r++) {
        const row = rows.nth(r);
        const cells = await row.locator('td').allTextContents();
        
        if (cells.length > 0) {
          const caseData = {};
          headers.forEach((header, idx) => {
            caseData[header.trim()] = cells[idx]?.trim() || '';
          });
          cases.push(caseData);
        }
      }
    }
  }
  
  console.log(`[MOO-STATUS] Extracted ${cases.length} pending cases`);
  return cases;
}

/**
 * Look for and download the pending status report PDF
 */
async function downloadPendingStatusReport(page) {
  console.log('[MOO-STATUS] Looking for downloadable pending status report...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  // The SPA guide mentions a "pending status report" available on the portal
  const downloadLinks = page.locator(
    'a:has-text("Pending Status Report"), ' +
    'a:has-text("Download Report"), ' +
    'a:has-text("Export"), ' +
    'a[href*="pending"], ' +
    'button:has-text("Export"), ' +
    'button:has-text("Download")'
  );
  
  const count = await downloadLinks.count();
  const downloadedFiles = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const link = downloadLinks.nth(i);
      const text = await link.textContent();
      
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
        link.click(),
      ]);
      
      if (download) {
        const filename = download.suggestedFilename() || 
          `pending-status-${Date.now()}.pdf`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        downloadedFiles.push(filePath);
        console.log(`[MOO-STATUS] Downloaded: ${filename}`);
      }
      
      await page.waitForTimeout(1000);
    } catch (error) {
      // Skip failed downloads
    }
  }
  
  return downloadedFiles;
}

/**
 * Scrape policy activity / status changes
 * Looks for recently issued, declined, or withdrawn policies
 */
async function scrapePolicyActivity(page) {
  console.log('[MOO-STATUS] Looking for policy activity / status changes...');
  
  // Navigate to activity or history section if available
  const activityLinks = page.locator(
    'a:has-text("Activity"), ' +
    'a:has-text("History"), ' +
    'a:has-text("Status"), ' +
    'a:has-text("Issued"), ' +
    'a:has-text("Recent")'
  );
  
  const count = await activityLinks.count();
  const activities = [];
  
  for (let i = 0; i < count; i++) {
    const link = activityLinks.nth(i);
    const text = await link.textContent();
    
    // Skip navigation links that are clearly not what we want
    if (text?.includes('Contact') || text?.includes('Support')) continue;
    
    try {
      await link.click();
      await page.waitForLoadState('networkidle');
      
      // Look for status data on the resulting page
      const statusItems = page.locator(
        '[class*="status"], ' +
        '[class*="activity"], ' +
        'tr:has(td:has-text("Issued")), ' +
        'tr:has(td:has-text("Declined")), ' +
        'tr:has(td:has-text("Withdrawn")), ' +
        'tr:has(td:has-text("Lapsed"))'
      );
      
      const statusCount = await statusItems.count();
      if (statusCount > 0) {
        console.log(`[MOO-STATUS] Found ${statusCount} status items in "${text?.trim()}"`);
        
        for (let s = 0; s < Math.min(statusCount, 50); s++) {
          const item = statusItems.nth(s);
          const itemText = await item.textContent();
          activities.push({
            section: text?.trim(),
            content: itemText?.trim(),
          });
        }
      }
      
      // Go back for next link
      await page.goBack().catch(() => {});
      await page.waitForLoadState('networkidle');
      
    } catch (error) {
      // Continue to next link
    }
  }
  
  return activities;
}

/**
 * Check for chargeback/lapse notifications
 * These may appear in a notifications section or commission adjustments
 */
async function scrapeChargebacks(page) {
  console.log('[MOO-STATUS] Looking for chargeback/lapse notifications...');
  
  // Navigate to Reports first for commission adjustments
  const reportsLink = page.locator('a:has-text("Reports")').first();
  if (await reportsLink.isVisible().catch(() => false)) {
    await reportsLink.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Look for chargeback-related content
  const chargebackIndicators = page.locator(
    'text=Chargeback, ' +
    'text=Charge Back, ' +
    'text=Adjustment, ' +
    'text=Debit, ' +
    'text=Lapse, ' +
    'text=Reversal, ' +
    'a:has-text("Adjustments"), ' +
    'a:has-text("Debit Balance")'
  );
  
  const count = await chargebackIndicators.count();
  const chargebacks = [];
  
  if (count > 0) {
    console.log(`[MOO-STATUS] Found ${count} chargeback-related elements`);
    
    for (let i = 0; i < count; i++) {
      const element = chargebackIndicators.nth(i);
      const text = await element.textContent();
      const parent = element.locator('..');
      const parentText = await parent.textContent().catch(() => '');
      
      chargebacks.push({
        indicator: text?.trim(),
        context: parentText?.trim().substring(0, 200),
      });
    }
  }
  
  return chargebacks;
}

/**
 * Main execution
 */
export async function downloadStatusReports() {
  let browser;
  
  try {
    // Login
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Navigate to My Business
    await navigateToMyBusiness(page);
    
    // Scrape pending cases
    const pendingCases = await scrapePendingCases(page);
    
    // Download pending status report
    const statusFiles = await downloadPendingStatusReport(page);
    
    // Scrape policy activity
    const activities = await scrapePolicyActivity(page);
    
    // Check for chargebacks
    const chargebacks = await scrapeChargebacks(page);
    
    // Save scraped data as JSON
    const outputDir = CONFIG.downloadDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (pendingCases.length > 0) {
      const filePath = path.join(outputDir, `pending-cases-${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(pendingCases, null, 2));
      console.log(`[MOO-STATUS] Saved ${pendingCases.length} pending cases to: ${filePath}`);
    }
    
    if (activities.length > 0) {
      const filePath = path.join(outputDir, `policy-activity-${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(activities, null, 2));
      console.log(`[MOO-STATUS] Saved ${activities.length} activity items to: ${filePath}`);
    }
    
    if (chargebacks.length > 0) {
      const filePath = path.join(outputDir, `chargebacks-${timestamp}.json`);
      fs.writeFileSync(filePath, JSON.stringify(chargebacks, null, 2));
      console.log(`[MOO-STATUS] Saved ${chargebacks.length} chargeback indicators to: ${filePath}`);
    }
    
    // Summary
    console.log('\n[MOO-STATUS] ═══════════════════════════════════════');
    console.log('[MOO-STATUS] Status Report Summary:');
    console.log(`[MOO-STATUS]   Pending Cases Scraped: ${pendingCases.length}`);
    console.log(`[MOO-STATUS]   Status Report PDFs: ${statusFiles.length}`);
    console.log(`[MOO-STATUS]   Policy Activities: ${activities.length}`);
    console.log(`[MOO-STATUS]   Chargeback Indicators: ${chargebacks.length}`);
    console.log('[MOO-STATUS] ═══════════════════════════════════════');
    
    await browser.close();
    return { pendingCases, statusFiles, activities, chargebacks };
    
  } catch (error) {
    console.error('[MOO-STATUS] Fatal error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('download-status-reports.js')) {
  try {
    await downloadStatusReports();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
