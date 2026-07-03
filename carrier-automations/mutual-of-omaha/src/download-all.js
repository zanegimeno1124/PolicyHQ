/**
 * Mutual of Omaha - Complete Download Orchestrator
 * 
 * Runs all download scripts in sequence:
 * 1. Login and authenticate
 * 2. Download commission statements
 * 3. Download status reports and chargeback data
 * 4. Output summary for reconciliation pipeline
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { downloadAllCommissions } from './download-commissions.js';
import { downloadStatusReports } from './download-status-reports.js';

dotenv.config();

const RESULTS_DIR = path.resolve('./downloads/results');

async function main() {
  const startTime = Date.now();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MUTUAL OF OMAHA - AUTOMATED REPORT DOWNLOAD               ║');
  console.log('║  Sales Professional Access Portal                           ║');
  console.log(`║  Run: ${new Date().toISOString()}                  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    carrier: 'Mutual of Omaha',
    portal: 'Sales Professional Access (SPA)',
    commissions: { files: [], error: null },
    status: { pendingCases: [], activities: [], chargebacks: [], files: [], error: null },
  };

  // Step 1: Download Commission Statements
  console.log('\n━━━ PHASE 1: Commission Statements ━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const commResult = await downloadAllCommissions();
    results.commissions.files = [
      ...commResult.commissionFiles,
      ...commResult.statusFiles,
    ];
  } catch (error) {
    results.commissions.error = error.message;
    console.error('[DOWNLOAD-ALL] Commission download failed:', error.message);
  }

  // Step 2: Download Status Reports
  console.log('\n━━━ PHASE 2: Status Reports & Chargebacks ━━━━━━━━━━━━━━━━━━━');
  try {
    const statusResult = await downloadStatusReports();
    results.status.pendingCases = statusResult.pendingCases;
    results.status.activities = statusResult.activities;
    results.status.chargebacks = statusResult.chargebacks;
    results.status.files = statusResult.statusFiles;
  } catch (error) {
    results.status.error = error.message;
    console.error('[DOWNLOAD-ALL] Status report download failed:', error.message);
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
  console.log(`║  Commission Files:    ${String(results.commissions.files.length).padEnd(38)}║`);
  console.log(`║  Status Report Files: ${String(results.status.files.length).padEnd(38)}║`);
  console.log(`║  Pending Cases:       ${String(results.status.pendingCases.length).padEnd(38)}║`);
  console.log(`║  Policy Activities:   ${String(results.status.activities.length).padEnd(38)}║`);
  console.log(`║  Chargebacks Found:   ${String(results.status.chargebacks.length).padEnd(38)}║`);
  console.log(`║  Elapsed Time:        ${(elapsed + 's').padEnd(38)}║`);
  console.log(`║  Results Saved:       ${resultsPath.split('/').pop().padEnd(38)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  if (results.commissions.error || results.status.error) {
    console.log('\n⚠️  Some operations had errors:');
    if (results.commissions.error) console.log(`   Commissions: ${results.commissions.error}`);
    if (results.status.error) console.log(`   Status: ${results.status.error}`);
  }
  
  return results;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
