/**
 * TransAmerica - Complete Download Orchestrator
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { downloadAllCommissions } from './download-commissions.js';
import { downloadPolicyData } from './download-policies.js';

dotenv.config();

const RESULTS_DIR = path.resolve('./downloads/results');

async function main() {
  const startTime = Date.now();
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TRANSAMERICA - AUTOMATED REPORT DOWNLOAD                  ║');
  console.log(`║  Portal: ${(process.env.PORTAL || 'transact').padEnd(50)}║`);
  console.log(`║  Run: ${new Date().toISOString()}                  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    timestamp: new Date().toISOString(),
    carrier: 'TransAmerica',
    portal: process.env.PORTAL || 'transact',
    commissions: { summary: [], statements: [], exports: [], error: null },
    policies: { pending: [], inForce: [], statusChanges: [], correspondences: [], files: [], error: null },
  };

  // Phase 1: Commission Data
  console.log('\n━━━ PHASE 1: Commission Statements & Data ━━━━━━━━━━━━━━━━━━━');
  try {
    const commResult = await downloadAllCommissions();
    results.commissions.summary = commResult.summary;
    results.commissions.statements = commResult.statementFiles;
    results.commissions.exports = commResult.exportFiles;
  } catch (error) {
    results.commissions.error = error.message;
    console.error('[DOWNLOAD-ALL] Commission download failed:', error.message);
  }

  // Phase 2: Policy Status Data
  console.log('\n━━━ PHASE 2: Policy Status & Pending Business ━━━━━━━━━━━━━━━');
  try {
    const polResult = await downloadPolicyData();
    results.policies.pending = polResult.pendingCases;
    results.policies.inForce = polResult.inForcePolicies;
    results.policies.statusChanges = polResult.statusChanges;
    results.policies.correspondences = polResult.correspondences;
    results.policies.files = polResult.reportFiles;
  } catch (error) {
    results.policies.error = error.message;
    console.error('[DOWNLOAD-ALL] Policy data download failed:', error.message);
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
  console.log(`║  Statement PDFs:         ${String(results.commissions.statements.length).padEnd(35)}║`);
  console.log(`║  Export Files:           ${String(results.commissions.exports.length).padEnd(35)}║`);
  console.log(`║  Pending Cases:          ${String(results.policies.pending.length).padEnd(35)}║`);
  console.log(`║  In Force Policies:      ${String(results.policies.inForce.length).padEnd(35)}║`);
  console.log(`║  Status Changes:         ${String(results.policies.statusChanges.length).padEnd(35)}║`);
  console.log(`║  Correspondences:        ${String(results.policies.correspondences.length).padEnd(35)}║`);
  console.log(`║  Elapsed Time:           ${(elapsed + 's').padEnd(35)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  if (results.commissions.error || results.policies.error) {
    console.log('\n⚠️  Some operations had errors:');
    if (results.commissions.error) console.log(`   Commissions: ${results.commissions.error}`);
    if (results.policies.error) console.log(`   Policies: ${results.policies.error}`);
  }
  
  return results;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
