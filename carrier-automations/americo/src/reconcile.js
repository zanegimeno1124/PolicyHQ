/**
 * Americo Financial - PolicyHQ Reconciliation Engine
 * 
 * Matches downloaded Americo data against PolicyHQ records to:
 * 1. Confirm policy issuance (Americo says issued → update PolicyHQ)
 * 2. Detect chargebacks (negative commission entries → alert agent)
 * 3. Reconcile commissions (Americo paid vs. PolicyHQ expected)
 * 4. Flag discrepancies for manual review
 * 
 * Americo-Specific Notes:
 * - "Instant Decision" products issue immediately (Final Expense, Term, IUL)
 * - Commission statements have specific fields (see Commission Statement Guide)
 * - Chargebacks appear as negative entries in commission transactions
 * - Policy numbers follow Americo's numbering format
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const CONFIG = {
  policyHqBase: process.env.POLICYHQ_API_BASE || 'https://api1.simplyworkcrm.com/api:xyNb4DPW',
  policyHqToken: process.env.POLICYHQ_AUTH_TOKEN,
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads'),
  outputDir: path.resolve('./reconciliation-output'),
  premiumTolerance: 0.05,
};

/**
 * Fetch Americo policies from PolicyHQ
 */
async function fetchPolicyHQRecords(startDate, endDate) {
  if (!CONFIG.policyHqToken) {
    console.warn('[RECONCILE] No PolicyHQ token configured. Using local data only.');
    return [];
  }
  
  try {
    const params = new URLSearchParams({
      start_date: String(startDate),
      end_date: String(endDate),
    });
    
    const response = await fetch(
      `${CONFIG.policyHqBase}/agency/policies/summary?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.policyHqToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) throw new Error(`PolicyHQ API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[RECONCILE] Failed to fetch PolicyHQ records:', error.message);
    return [];
  }
}

/**
 * Load all downloaded data files
 */
function loadDownloadedData() {
  const data = { commissions: [], pending: [], chargebacks: [], transactions: [] };
  
  const findJsonFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) files.push(...findJsonFiles(fullPath));
      else if (item.endsWith('.json')) files.push(fullPath);
    }
    return files;
  };
  
  const files = findJsonFiles(CONFIG.downloadDir);
  
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const filename = path.basename(file).toLowerCase();
      
      if (filename.includes('commission') || filename.includes('summary')) {
        if (Array.isArray(content)) data.commissions.push(...content);
      } else if (filename.includes('pending') || filename.includes('status')) {
        if (Array.isArray(content)) data.pending.push(...content);
        else if (typeof content === 'object') {
          // Status data is keyed by status name
          Object.values(content).forEach(items => {
            if (Array.isArray(items)) data.pending.push(...items);
          });
        }
      } else if (filename.includes('chargeback')) {
        if (Array.isArray(content)) data.chargebacks.push(...content);
      } else if (filename.includes('transaction')) {
        if (Array.isArray(content)) data.transactions.push(...content);
      }
    } catch (e) {
      console.warn(`[RECONCILE] Could not parse ${file}:`, e.message);
    }
  }
  
  return data;
}

/**
 * Match an Americo record against PolicyHQ records
 */
function findMatch(americoRecord, policyHQRecords) {
  const matches = [];
  
  for (const phqRecord of policyHQRecords) {
    let score = 0;
    const reasons = [];
    
    // Policy number match (Americo uses specific numbering)
    const americoPolicy = americoRecord['Policy Number'] || americoRecord['Policy No'] || 
                          americoRecord.policyNumber || americoRecord.policy_number;
    if (americoPolicy && phqRecord.policy_number) {
      if (americoPolicy === phqRecord.policy_number) {
        score += 100;
        reasons.push('policy_number_exact');
      }
    }
    
    // Agent number match
    const americoAgent = americoRecord['Agent Number'] || americoRecord['Agent No'] || 
                         americoRecord.agentNumber || americoRecord.agent_number;
    if (americoAgent && phqRecord.agent_npn) {
      if (americoAgent === phqRecord.agent_npn) {
        score += 25;
        reasons.push('agent_number_match');
      }
    }
    
    // Insured name match
    const americoName = (americoRecord['Insured'] || americoRecord['Insured Name'] || 
                         americoRecord.insuredName || americoRecord.clientName || '').toLowerCase().trim();
    const phqName = (phqRecord.client_name || '').toLowerCase().trim();
    if (americoName && phqName) {
      if (americoName === phqName) {
        score += 30;
        reasons.push('insured_name_exact');
      } else if (americoName.includes(phqName) || phqName.includes(americoName)) {
        score += 20;
        reasons.push('insured_name_partial');
      }
    }
    
    // Premium/face amount match
    const americoAmount = parseFloat(
      (americoRecord['Premium'] || americoRecord['Annual Premium'] || 
       americoRecord.premium || '0').replace(/[$,]/g, '')
    );
    const phqAmount = parseFloat(phqRecord.premium || 0);
    if (americoAmount > 0 && phqAmount > 0) {
      const diff = Math.abs(americoAmount - phqAmount) / phqAmount;
      if (diff === 0) {
        score += 25;
        reasons.push('premium_exact');
      } else if (diff <= CONFIG.premiumTolerance) {
        score += 15;
        reasons.push('premium_fuzzy');
      }
    }
    
    // Date proximity
    const americoDate = new Date(
      americoRecord['Issue Date'] || americoRecord['App Date'] || 
      americoRecord.issueDate || americoRecord.date || ''
    );
    const phqDate = new Date(phqRecord.submission_date || '');
    if (!isNaN(americoDate) && !isNaN(phqDate)) {
      const daysDiff = Math.abs(americoDate - phqDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 14) {
        score += 10;
        reasons.push('date_proximity');
      }
    }
    
    if (score >= 50) {
      matches.push({
        policyHQRecord: phqRecord,
        score,
        reasons,
        confidence: score >= 100 ? 'high' : score >= 70 ? 'medium' : 'low',
      });
    }
  }
  
  matches.sort((a, b) => b.score - a.score);
  return matches[0] || null;
}

/**
 * Determine action based on Americo status vs PolicyHQ status
 */
function determineAction(americoStatus, phqStatus) {
  const normalized = `${(americoStatus || '').toLowerCase()}|${(phqStatus || '').toLowerCase()}`;
  
  const actionMap = {
    'issued|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'issued|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'in force|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'in force|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'declined|submitted': { action: 'ALERT_AGENT', reason: 'Application declined by Americo', priority: 'high' },
    'declined|pending': { action: 'ALERT_AGENT', reason: 'Application declined by Americo', priority: 'high' },
    'not taken|submitted': { action: 'ALERT_AGENT', reason: 'Policy not taken', priority: 'normal' },
    'lapsed|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'lapsed|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'cancelled|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled', priority: 'urgent' },
    'cancelled|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled', priority: 'urgent' },
    'surrendered|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy surrendered', priority: 'urgent' },
    'withdrawn|submitted': { action: 'UPDATE_STATUS', newStatus: 'withdrawn', priority: 'normal' },
  };
  
  return actionMap[normalized] || { action: 'MANUAL_REVIEW', priority: 'normal' };
}

/**
 * Identify chargebacks from transaction data
 */
function identifyChargebacks(transactions) {
  return transactions.filter(tx => {
    const amount = tx['Commission'] || tx['Amount'] || tx.amount || '';
    const type = tx['Type'] || tx['Transaction Type'] || tx.type || '';
    
    // Negative amounts indicate chargebacks
    const isNegative = amount.toString().includes('-');
    const isChargeback = type.toLowerCase().includes('chargeback') || 
                         type.toLowerCase().includes('reversal') ||
                         type.toLowerCase().includes('debit');
    
    return isNegative || isChargeback;
  });
}

/**
 * Generate reconciliation report
 */
function generateReport(results, data) {
  const chargebacksFromTx = identifyChargebacks(data.transactions);
  
  return {
    generated: new Date().toISOString(),
    carrier: 'Americo Financial',
    dataLoaded: {
      commissionRecords: data.commissions.length,
      pendingRecords: data.pending.length,
      transactionRecords: data.transactions.length,
      chargebackIndicators: data.chargebacks.length,
      chargebacksFromTransactions: chargebacksFromTx.length,
    },
    summary: {
      totalRecords: results.length,
      matched: results.filter(r => r.match).length,
      unmatched: results.filter(r => !r.match).length,
      actionsRequired: results.filter(r => r.action?.action !== 'MANUAL_REVIEW').length,
      urgentAlerts: results.filter(r => r.action?.priority === 'urgent').length,
    },
    chargebacks: {
      fromTransactions: chargebacksFromTx,
      fromIndicators: data.chargebacks,
    },
    actions: {
      statusUpdates: results.filter(r => r.action?.action === 'UPDATE_STATUS'),
      chargebackAlerts: results.filter(r => r.action?.action === 'CHARGEBACK_ALERT'),
      agentAlerts: results.filter(r => r.action?.action === 'ALERT_AGENT'),
      manualReview: results.filter(r => r.action?.action === 'MANUAL_REVIEW'),
    },
    details: results,
  };
}

/**
 * Main reconciliation
 */
export async function reconcile() {
  console.log('[RECONCILE] Starting Americo Financial reconciliation...');
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  const data = loadDownloadedData();
  console.log(`[RECONCILE] Loaded: ${data.commissions.length} commissions, ${data.pending.length} pending, ${data.transactions.length} transactions`);
  
  // Fetch PolicyHQ records
  const now = Date.now();
  const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
  const policyHQRecords = await fetchPolicyHQRecords(sixtyDaysAgo, now);
  console.log(`[RECONCILE] Fetched ${policyHQRecords.length} PolicyHQ records`);
  
  // Combine all Americo records
  const allRecords = [...data.pending, ...data.commissions];
  
  // Match and reconcile
  const results = allRecords.map(record => {
    const match = findMatch(record, policyHQRecords);
    const status = record['Status'] || record.status || '';
    const action = match
      ? determineAction(status, match.policyHQRecord.status)
      : { action: 'NO_MATCH', priority: 'normal' };
    
    return { americoRecord: record, match, action };
  });
  
  // Generate report
  const report = generateReport(results, data);
  
  // Save
  const reportPath = path.join(CONFIG.outputDir, `americo-reconciliation-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n[RECONCILE] ═══════════════════════════════════════════════════');
  console.log('[RECONCILE] AMERICO RECONCILIATION SUMMARY');
  console.log('[RECONCILE] ═══════════════════════════════════════════════════');
  console.log(`[RECONCILE]   Total Records:     ${report.summary.totalRecords}`);
  console.log(`[RECONCILE]   Matched:           ${report.summary.matched}`);
  console.log(`[RECONCILE]   Unmatched:         ${report.summary.unmatched}`);
  console.log(`[RECONCILE]   Actions Required:  ${report.summary.actionsRequired}`);
  console.log(`[RECONCILE]   URGENT Alerts:     ${report.summary.urgentAlerts}`);
  console.log(`[RECONCILE]   Chargebacks (TX):  ${report.chargebacks.fromTransactions.length}`);
  console.log('[RECONCILE] ═══════════════════════════════════════════════════');
  console.log(`[RECONCILE] Report saved: ${reportPath}`);
  
  return report;
}

// Run directly
if (process.argv[1] && process.argv[1].includes('reconcile.js')) {
  try {
    await reconcile();
    process.exit(0);
  } catch (error) {
    console.error('[RECONCILE] Fatal error:', error.message);
    process.exit(1);
  }
}
