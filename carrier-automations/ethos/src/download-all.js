/**
 * Ethos Life - Complete Download Orchestrator
 * 
 * Runs all download scripts in sequence:
 * 1. Login and authenticate
 * 2. Download earnings/commission data
 * 3. Download customer/policy status data
 * 4. Output summary for reconciliation pipeline
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { downloadAllEarnings } from './download-earnings.js';
import { downloadCustomerData } from './download-customers.js';

dotenv.config();

const RESULTS_DIR = path.resolve('./downloads/results');

async function main() {
  const startTime = Date.now();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ETHOS LIFE - AUTOMATED REPORT DOWNLOAD                    ║');
  console.log('║  Agent Portal (agents.ethoslife.com)                        ║');
  console.log(`║  Run: ${new Date().toISOString()}                  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    carrier: 'Ethos Life',
    portal: 'Ethos Agent Portal',
    earnings: { apiData: [], scraped: [], files: [], error: null },
    customers: { apiData: [], records: [], statusChanges: [], files: [], error: null },
  };

  // Phase 1: Earnings/Commission Data
  console.log('\n━━━ PHASE 1: Earnings & Commission Data ━━━━━━━━━━━━━━━━━━━━━');
  try {
    const earnResult = await downloadAllEarnings();
    results.earnings.apiData = earnResult.apiData;
    results.earnings.scraped = earnResult.scrapedEarnings;
    results.earnings.files = earnResult.downloadedFiles;
  } catch (error) {
    results.earnings.error = error.message;
    console.error('[DOWNLOAD-ALL] Earnings download failed:', error.message);
  }

  // Phase 2: Customer/Policy Status Data
  console.log('\n━━━ PHASE 2: Customer & Policy Status Data ━━━━━━━━━━━━━━━━━━');
  try {
    const custResult = await downloadCustomerData();
    results.customers.apiData = custResult.apiData;
    results.customers.records = custResult.customers;
    results.customers.statusChanges = custResult.statusChanges;
    results.customers.files = custResult.downloadedFiles;
  } catch (error) {
    results.customers.error = error.message;
    console.error('[DOWNLOAD-ALL] Customer data download failed:', error.message);
  }

  // Save run results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const resultsPath = path.join(RESULTS_DIR, `run-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  // Final Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DOWNLOAD COMPLETE                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Earnings API Captures:  ${String(results.earnings.apiData.length).padEnd(35)}║`);
  console.log(`║  Earnings Scraped:       ${String(results.earnings.scraped.length).padEnd(35)}║`);
  console.log(`║  Customer Records:       ${String(results.customers.records.length).padEnd(35)}║`);
  console.log(`║  Status Categories:      ${String(results.customers.statusChanges.length).padEnd(35)}║`);
  console.log(`║  Downloaded Files:       ${String(results.earnings.files.length + results.customers.files.length).padEnd(35)}║`);
  console.log(`║  Elapsed Time:           ${(elapsed + 's').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  if (results.earnings.error || results.customers.error) {
    console.log('\n⚠️  Some operations had errors:');
    if (results.earnings.error) console.log(`   Earnings: ${results.earnings.error}`);
    if (results.customers.error) console.log(`   Customers: ${results.customers.error}`);
  }
  
  return results;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
