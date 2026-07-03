/**
 * Mutual of Omaha - Commission Statement Downloader
 * 
 * Navigates the SPA portal to the Reports > Compensation Brokerage section
 * and downloads all available commission statements.
 * 
 * Portal path: Reports tab → Compensation Brokerage section
 * Expected formats: PDF commission statements
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
  portalBase: 'https://producer.mutualofomaha.com',
};

/**
 * Navigate to the Reports section of the portal
 */
async function navigateToReports(page) {
  console.log('[MOO-COMM] Navigating to Reports section...');
  
  // Look for the Reports tab/link in the main navigation
  // The SPA portal uses a tab-based navigation
  const reportsLink = page.locator(
    'a:has-text("Reports"), ' +
    'nav a:has-text("Reports"), ' +
    '[role="tab"]:has-text("Reports"), ' +
    'li a:has-text("Reports")'
  ).first();
  
  if (await reportsLink.isVisible().catch(() => false)) {
    await reportsLink.click();
    await page.waitForLoadState('networkidle');
    console.log('[MOO-COMM] Navigated to Reports via tab click');
  } else {
    // Try direct URL navigation to reports page
    const reportsUrls = [
      `${CONFIG.portalBase}/enterprise/portal/home/reports`,
      `${CONFIG.portalBase}/enterprise/myportal#!/reports`,
      `${CONFIG.portalBase}/enterprise/portal/reports`,
    ];
    
    for (const url of reportsUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const currentUrl = page.url();
        if (!currentUrl.includes('accounts.mutualofomaha.com')) {
          console.log('[MOO-COMM] Navigated to Reports via URL:', url);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return page;
}

/**
 * Find and download commission statements from the Compensation Brokerage section
 */
async function downloadCommissionStatements(page) {
  console.log('[MOO-COMM] Looking for Compensation Brokerage section...');
  
  // Ensure download directory exists
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }
  
  // Look for the Compensation Brokerage section
  // According to the SPA guide, you scroll down on the Reports page to find it
  const compensationSection = page.locator(
    'text=Compensation Brokerage, ' +
    'text=Commission Statement, ' +
    'h2:has-text("Compensation"), ' +
    'h3:has-text("Compensation"), ' +
    'a:has-text("Compensation Brokerage")'
  ).first();
  
  if (await compensationSection.isVisible().catch(() => false)) {
    await compensationSection.scrollIntoViewIfNeeded();
    console.log('[MOO-COMM] Found Compensation Brokerage section');
  } else {
    // Scroll down to find it
    console.log('[MOO-COMM] Scrolling to find Compensation section...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);
  }
  
  // Look for downloadable commission statement links/buttons
  // These are typically PDF links or download buttons
  const statementLinks = page.locator(
    'a[href*="commission"], ' +
    'a[href*="compensation"], ' +
    'a[href*="statement"], ' +
    'a[href*="EDRDocument"], ' +
    'a[href*=".pdf"]:near(:text("Commission")), ' +
    'a[href*=".pdf"]:near(:text("Compensation")), ' +
    'button:has-text("Download"):near(:text("Commission"))'
  );
  
  const count = await statementLinks.count();
  console.log(`[MOO-COMM] Found ${count} potential commission statement links`);
  
  const downloadedFiles = [];
  
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      try {
        const link = statementLinks.nth(i);
        const linkText = await link.textContent();
        const href = await link.getAttribute('href');
        
        console.log(`[MOO-COMM] Downloading (${i + 1}/${count}): ${linkText?.trim() || href}`);
        
        // Set up download listener
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
          link.click(),
        ]);
        
        if (download) {
          const filename = download.suggestedFilename() || `commission-statement-${Date.now()}-${i}.pdf`;
          const filePath = path.join(CONFIG.downloadDir, filename);
          await download.saveAs(filePath);
          downloadedFiles.push(filePath);
          console.log(`[MOO-COMM] Saved: ${filename}`);
        } else {
          // If no download event, it might open in a new tab or navigate
          // Check if a new page opened
          const pages = page.context().pages();
          if (pages.length > 1) {
            const newPage = pages[pages.length - 1];
            await newPage.waitForLoadState('networkidle');
            
            // Try to get the PDF content from the new page
            const newUrl = newPage.url();
            if (newUrl.includes('.pdf') || newUrl.includes('EDRDocument')) {
              const filename = `commission-statement-${Date.now()}-${i}.pdf`;
              const filePath = path.join(CONFIG.downloadDir, filename);
              
              // Download via the response
              const response = await newPage.goto(newUrl);
              const buffer = await response.body();
              fs.writeFileSync(filePath, buffer);
              downloadedFiles.push(filePath);
              console.log(`[MOO-COMM] Saved from new tab: ${filename}`);
            }
            await newPage.close();
          }
        }
        
        // Small delay between downloads
        await page.waitForTimeout(1000);
        
      } catch (error) {
        console.warn(`[MOO-COMM] Failed to download item ${i + 1}:`, error.message);
      }
    }
  }
  
  return downloadedFiles;
}

/**
 * Alternative approach: Look for the specific report links mentioned in the SPA guide
 * "Med Supp, LTC, DI and Other Health Products" link for case status
 */
async function downloadCaseStatusReports(page) {
  console.log('[MOO-COMM] Looking for case status report links...');
  
  const statusDir = path.resolve(process.env.DOWNLOAD_DIR || './downloads/status-reports');
  if (!fs.existsSync(statusDir)) {
    fs.mkdirSync(statusDir, { recursive: true });
  }
  
  // Look for the specific report category links
  const reportCategories = [
    'Med Supp, LTC, DI and Other Health Products',
    'Life Insurance',
    'Annuity',
    'Case Status',
    'Pending Cases',
    'Production Report',
  ];
  
  const downloadedFiles = [];
  
  for (const category of reportCategories) {
    const link = page.locator(`a:has-text("${category}")`).first();
    
    if (await link.isVisible().catch(() => false)) {
      console.log(`[MOO-COMM] Found report category: ${category}`);
      
      try {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
          link.click(),
        ]);
        
        if (download) {
          const filename = download.suggestedFilename() || 
            `${category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}.pdf`;
          const filePath = path.join(statusDir, filename);
          await download.saveAs(filePath);
          downloadedFiles.push(filePath);
          console.log(`[MOO-COMM] Downloaded: ${filename}`);
        }
        
        // Navigate back if needed
        if (!page.url().includes('reports')) {
          await page.goBack();
          await page.waitForLoadState('networkidle');
        }
        
      } catch (error) {
        console.warn(`[MOO-COMM] Could not download ${category}:`, error.message);
      }
    }
  }
  
  return downloadedFiles;
}

/**
 * Main execution: Login, navigate to reports, download everything
 */
export async function downloadAllCommissions() {
  let browser;
  
  try {
    // Step 1: Login
    const session = await login();
    browser = session.browser;
    const page = session.page;
    
    // Step 2: Navigate to Reports
    await navigateToReports(page);
    
    // Step 3: Download commission statements
    const commissionFiles = await downloadCommissionStatements(page);
    
    // Step 4: Download case status reports
    const statusFiles = await downloadCaseStatusReports(page);
    
    // Summary
    console.log('\n[MOO-COMM] ═══════════════════════════════════════');
    console.log('[MOO-COMM] Download Summary:');
    console.log(`[MOO-COMM]   Commission Statements: ${commissionFiles.length} files`);
    console.log(`[MOO-COMM]   Status Reports: ${statusFiles.length} files`);
    console.log('[MOO-COMM] ═══════════════════════════════════════');
    
    if (commissionFiles.length > 0) {
      console.log('\n[MOO-COMM] Commission files:');
      commissionFiles.forEach(f => console.log(`  → ${f}`));
    }
    if (statusFiles.length > 0) {
      console.log('\n[MOO-COMM] Status report files:');
      statusFiles.forEach(f => console.log(`  → ${f}`));
    }
    
    await browser.close();
    return { commissionFiles, statusFiles };
    
  } catch (error) {
    console.error('[MOO-COMM] Fatal error:', error.message);
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
