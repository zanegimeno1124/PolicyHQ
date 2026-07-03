/**
 * TransAmerica - Policy Status & Pending Business Downloader
 * 
 * Downloads policy data from the TransAmerica Life Access portal:
 * 1. Pending business (applications in underwriting)
 * 2. In force policy details
 * 3. Policy status changes (issued, lapsed, cancelled)
 * 4. Customer correspondences
 * 5. Pending case requirements
 * 
 * TransAmerica Life Access features:
 * - Enhanced book of business (pending + in force)
 * - Monitor pending case requirements at every stage
 * - View applications and policy packets
 * - Customer correspondences
 * 
 * Products covered: Term, Final Expense, IUL, Whole Life, Medicare
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { login } from './login.js';

dotenv.config();

const CONFIG = {
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads/policies'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
};

/**
 * Navigate to the Book of Business / Policies section
 */
async function navigateToPolicies(page) {
  console.log('[TA-POL] Navigating to Book of Business...');
  
  const policyLinks = page.locator(
    'a:has-text("Book of Business"), ' +
    'a:has-text("Policies"), ' +
    'a:has-text("In Force"), ' +
    'a:has-text("My Business"), ' +
    'a:has-text("Policy"), ' +
    'nav a:has-text("Business"), ' +
    '[class*="menu"] a:has-text("Business"), ' +
    'a[href*="business" i], ' +
    'a[href*="policy" i], ' +
    'a[href*="inforce" i]'
  ).first();
  
  if (await policyLinks.isVisible().catch(() => false)) {
    await policyLinks.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('[TA-POL] Navigated to Book of Business');
    return true;
  }
  
  return false;
}

/**
 * Navigate to Pending Business section
 */
async function navigateToPending(page) {
  console.log('[TA-POL] Navigating to Pending Business...');
  
  const pendingLink = page.locator(
    'a:has-text("Pending"), ' +
    'a:has-text("Pending Business"), ' +
    'a:has-text("Pending Cases"), ' +
    'nav a:has-text("Pending"), ' +
    '[class*="menu"] a:has-text("Pending"), ' +
    'a[href*="pending" i], ' +
    '[role="tab"]:has-text("Pending"), ' +
    'button:has-text("Pending")'
  ).first();
  
  if (await pendingLink.isVisible().catch(() => false)) {
    await pendingLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('[TA-POL] Navigated to Pending Business');
    return true;
  }
  
  return false;
}

/**
 * Scrape pending business data
 */
async function scrapePendingBusiness(page) {
  console.log('[TA-POL] Scraping pending business data...');
  
  const pendingCases = [];
  const tables = page.locator('table');
  const tableCount = await tables.count();
  
  if (tableCount > 0) {
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
          const record = { _source: 'pending' };
          headers.forEach((header, idx) => {
            record[header.trim()] = cells[idx]?.trim() || '';
          });
          pendingCases.push(record);
        }
      }
    }
  } else {
    // Card/list-based UI
    const items = page.locator(
      '[class*="pending"], [class*="case"], [class*="application"], [class*="policy-row"]'
    );
    const itemCount = await items.count();
    
    for (let i = 0; i < Math.min(itemCount, 100); i++) {
      const item = items.nth(i);
      const text = await item.textContent();
      if (text && text.trim().length > 5) {
        pendingCases.push({ raw: text.trim(), index: i, _source: 'pending_card' });
      }
    }
  }
  
  console.log(`[TA-POL] Found ${pendingCases.length} pending cases`);
  return pendingCases;
}

/**
 * Scrape in force policy data
 */
async function scrapeInForcePolicies(page) {
  console.log('[TA-POL] Looking for In Force policies...');
  
  // Navigate to In Force tab/section
  const inForceLink = page.locator(
    'a:has-text("In Force"), ' +
    'button:has-text("In Force"), ' +
    '[role="tab"]:has-text("In Force"), ' +
    'a:has-text("Active"), ' +
    'a[href*="inforce" i]'
  ).first();
  
  if (await inForceLink.isVisible().catch(() => false)) {
    await inForceLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  
  const policies = [];
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
        const record = { _source: 'in_force' };
        headers.forEach((header, idx) => {
          record[header.trim()] = cells[idx]?.trim() || '';
        });
        policies.push(record);
      }
    }
  }
  
  console.log(`[TA-POL] Found ${policies.length} in force policies`);
  return policies;
}

/**
 * Look for policy status changes and lapse/cancellation indicators
 */
async function detectStatusChanges(page) {
  console.log('[TA-POL] Checking for status changes and lapses...');
  
  const statusChanges = [];
  
  // Look for status-related tabs or filters
  const statusFilters = ['Lapsed', 'Cancelled', 'Terminated', 'Not Taken', 'Declined'];
  
  for (const status of statusFilters) {
    const filterLink = page.locator(
      `a:has-text("${status}"), ` +
      `button:has-text("${status}"), ` +
      `[role="tab"]:has-text("${status}"), ` +
      `option:has-text("${status}")`
    ).first();
    
    if (await filterLink.isVisible().catch(() => false)) {
      try {
        await filterLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        
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
              const record = { _status: status };
              headers.forEach((h, idx) => {
                record[h.trim()] = cells[idx]?.trim() || '';
              });
              items.push(record);
            }
          }
        }
        
        if (items.length > 0) {
          statusChanges.push({ status, count: items.length, items });
          console.log(`[TA-POL] Found ${items.length} policies with status: ${status}`);
        }
      } catch (e) {
        // Filter didn't work
      }
    }
  }
  
  return statusChanges;
}

/**
 * Check for correspondences (letters about policy changes)
 */
async function scrapeCorrespondences(page) {
  console.log('[TA-POL] Looking for customer correspondences...');
  
  const corrLink = page.locator(
    'a:has-text("Correspondence"), ' +
    'a:has-text("Letters"), ' +
    'a:has-text("Notifications"), ' +
    'a[href*="correspondence" i], ' +
    'a[href*="letter" i]'
  ).first();
  
  const correspondences = [];
  
  if (await corrLink.isVisible().catch(() => false)) {
    await corrLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const items = page.locator(
      'table tr, [class*="correspondence"], [class*="letter"], [class*="notification"]'
    );
    
    const count = await items.count();
    for (let i = 0; i < Math.min(count, 50); i++) {
      const item = items.nth(i);
      const text = await item.textContent();
      if (text && text.trim().length > 5) {
        correspondences.push({ raw: text.trim(), index: i });
      }
    }
    
    console.log(`[TA-POL] Found ${correspondences.length} correspondences`);
  }
  
  return correspondences;
}

/**
 * Download any available reports/exports
 */
async function downloadReports(page) {
  console.log('[TA-POL] Looking for downloadable reports...');
  
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  const downloadLinks = page.locator(
    'a:has-text("Export"), ' +
    'button:has-text("Export"), ' +
    'a:has-text("Download"), ' +
    'button:has-text("Download"), ' +
    'a[href*=".pdf"], ' +
    'a[href*="export" i], ' +
    'a[href*="report" i]'
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
        const filename = download.suggestedFilename() || `ta-report-${i}-${Date.now()}.pdf`;
        const filePath = path.join(CONFIG.downloadDir, filename);
        await download.saveAs(filePath);
        files.push(filePath);
        console.log(`[TA-POL] Downloaded: ${filename}`);
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
export async function downloadPolicyData() {
  let browser;
  
  try {
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Navigate to book of business
    await navigateToPolicies(page);
    
    // Scrape pending business
    await navigateToPending(page);
    const pendingCases = await scrapePendingBusiness(page);
    
    // Scrape in force policies
    const inForcePolicies = await scrapeInForcePolicies(page);
    
    // Detect status changes (lapses, cancellations)
    const statusChanges = await detectStatusChanges(page);
    
    // Check correspondences
    const correspondences = await scrapeCorrespondences(page);
    
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
    
    if (inForcePolicies.length > 0) {
      const ifPath = path.join(CONFIG.downloadDir, `in-force-policies-${timestamp}.json`);
      fs.writeFileSync(ifPath, JSON.stringify(inForcePolicies, null, 2));
    }
    
    if (statusChanges.length > 0) {
      const scPath = path.join(CONFIG.downloadDir, `status-changes-${timestamp}.json`);
      fs.writeFileSync(scPath, JSON.stringify(statusChanges, null, 2));
    }
    
    if (correspondences.length > 0) {
      const corrPath = path.join(CONFIG.downloadDir, `correspondences-${timestamp}.json`);
      fs.writeFileSync(corrPath, JSON.stringify(correspondences, null, 2));
    }
    
    // Summary
    console.log('\n[TA-POL] ═══════════════════════════════════════');
    console.log('[TA-POL] Policy Data Summary:');
    console.log(`[TA-POL]   Pending Cases: ${pendingCases.length}`);
    console.log(`[TA-POL]   In Force Policies: ${inForcePolicies.length}`);
    console.log(`[TA-POL]   Status Changes: ${statusChanges.reduce((sum, s) => sum + s.items.length, 0)}`);
    console.log(`[TA-POL]   Correspondences: ${correspondences.length}`);
    console.log(`[TA-POL]   Report Files: ${reportFiles.length}`);
    console.log('[TA-POL] ═══════════════════════════════════════');
    
    await browser.close();
    return { pendingCases, inForcePolicies, statusChanges, correspondences, reportFiles };
    
  } catch (error) {
    console.error('[TA-POL] Fatal error:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('download-policies.js')) {
  try {
    await downloadPolicyData();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}
