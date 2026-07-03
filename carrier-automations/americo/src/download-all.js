/**
 * Americo Financial - Complete Download Orchestrator
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { downloadAllCommissions } from './download-commissions.js';
import { downloadPendingData } from './download-pending.js';

dotenv.config();

const RESULTS_DIR = path.resolve('./downloads/results');

async function main() {
  const startTime = Date.now();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  AMERICO FINANCIAL - AUTOMATED REPORT DOWNLOAD             ║');
  console.log('║  Agent Portal (portal.americoagent.com)                     ║');
  console.log(`║  Run: ${new Date().toISOString()}                  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    carrier: 'Americo Financial',
    portal: 'Americo Agent Portal',
    commissions: { summary: [], statements: [], transactions: [], error: null },
    pending: { cases: [], statusData: {}, chargebacks: [], files: [], error: null },
  };

  // Phase 1: Commission Data
  console.log('\n━━━ PHASE 1: Commission Statements & Transactions ━━━━━━━━━━━');
  try {
    const commResult = await downloadAllCommissions();
    results.commissions.summary = commResult.summary;
    results.commissions.statements = commResult.statementFiles;
    results.commissions.transactions = commResult.transactions;
  } catch (error) {
    results.commissions.error = error.message;
    console.error('[DOWNLOAD-ALL] Commission download failed:', error.message);
  }

  // Phase 2: Pending Business & Status
  console.log('\n━━━ PHASE 2: Pending Business & Policy Status ━━━━━━━━━━━━━━━');
  try {
    const pendResult = await downloadPendingData();
    results.pending.cases = pendResult.pendingCases;
    results.pending.statusData = pendResult.statusData;
    results.pending.chargebacks = pendResult.chargebacks;
    results.pending.files = pendResult.reportFiles;
  } catch (error) {
    results.pending.error = error.message;
    console.error('[DOWNLOAD-ALL] Pending data download failed:', error.message);
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
  console.log(`║  Commission Summary:     ${String(results.commissions.summary.length).padEnd(35)}║`);
  console.log(`║  Statement Files:        ${String(results.commissions.statements.length).padEnd(35)}║`);
  console.log(`║  Transactions:           ${String(results.commissions.transactions.length).padEnd(35)}║`);
  console.log(`║  Pending Cases:          ${String(results.pending.cases.length).padEnd(35)}║`);
  console.log(`║  Status Categories:      ${String(Object.keys(results.pending.statusData).length).padEnd(35)}║`);
  console.log(`║  Chargebacks:            ${String(results.pending.chargebacks.length).padEnd(35)}║`);
  console.log(`║  Elapsed Time:           ${(elapsed + 's').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  if (results.commissions.error || results.pending.error) {
    console.log('\n⚠️  Some operations had errors:');
    if (results.commissions.error) console.log(`   Commissions: ${results.commissions.error}`);
    if (results.pending.error) console.log(`   Pending: ${results.pending.error}`);
  }
  
  return results;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
