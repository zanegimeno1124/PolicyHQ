/**
 * TransAmerica - PolicyHQ Reconciliation Engine
 * 
 * Matches downloaded TransAmerica data against PolicyHQ records to:
 * 1. Confirm policy issuance (TA says in force → update PolicyHQ)
 * 2. Detect chargebacks (lapsed/cancelled → alert agent)
 * 3. Reconcile commissions (TA paid vs. PolicyHQ expected)
 * 4. Track pending case progress
 * 5. Flag correspondences that indicate action needed
 * 
 * TransAmerica-Specific Notes:
 * - Products: Term, Final Expense, IUL, Whole Life, Medicare
 * - Commission statements generated monthly
 * - Life Access portal tracks pending case requirements
 * - Correspondences may indicate policy changes
 * - No vesting for producer commissions
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
 * Fetch TransAmerica policies from PolicyHQ
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
  const data = { commissions: [], pending: [], inForce: [], statusChanges: [], correspondences: [] };
  
  const findJsonFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) files.push(...findJsonFiles(fullPath));
      else if (item.endsWith('.json') && !item.includes('run-')) files.push(fullPath);
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
      } else if (filename.includes('pending')) {
        if (Array.isArray(content)) data.pending.push(...content);
      } else if (filename.includes('in-force') || filename.includes('inforce')) {
        if (Array.isArray(content)) data.inForce.push(...content);
      } else if (filename.includes('status')) {
        if (Array.isArray(content)) {
          content.forEach(entry => {
            if (entry.items) data.statusChanges.push(...entry.items);
            else data.statusChanges.push(entry);
          });
        }
      } else if (filename.includes('correspondence')) {
        if (Array.isArray(content)) data.correspondences.push(...content);
      }
    } catch (e) {
      console.warn(`[RECONCILE] Could not parse ${file}:`, e.message);
    }
  }
  
  return data;
}

/**
 * Match a TransAmerica record against PolicyHQ records
 */
function findMatch(taRecord, policyHQRecords) {
  const matches = [];
  
  for (const phqRecord of policyHQRecords) {
    let score = 0;
    const reasons = [];
    
    // Policy number match
    const taPolicy = taRecord['Policy Number'] || taRecord['Policy No'] || 
                     taRecord['Policy #'] || taRecord.policyNumber || taRecord.policy_number;
    if (taPolicy && phqRecord.policy_number) {
      if (taPolicy === phqRecord.policy_number) {
        score += 100;
        reasons.push('policy_number_exact');
      } else if (taPolicy.includes(phqRecord.policy_number) || phqRecord.policy_number.includes(taPolicy)) {
        score += 60;
        reasons.push('policy_number_partial');
      }
    }
    
    // Insured/client name match
    const taName = (taRecord['Insured'] || taRecord['Insured Name'] || taRecord['Client'] || 
                    taRecord['Name'] || taRecord.insuredName || '').toLowerCase().trim();
    const phqName = (phqRecord.client_name || '').toLowerCase().trim();
    if (taName && phqName) {
      if (taName === phqName) {
        score += 30;
        reasons.push('insured_name_exact');
      } else if (taName.includes(phqName) || phqName.includes(taName)) {
        score += 20;
        reasons.push('insured_name_partial');
      } else {
        // Check last name match
        const taLast = taName.split(/[,\s]+/)[0];
        const phqLast = phqName.split(/[,\s]+/).pop();
        if (taLast && phqLast && (taLast === phqLast || taLast.includes(phqLast))) {
          score += 15;
          reasons.push('last_name_match');
        }
      }
    }
    
    // Premium/face amount match
    const taAmount = parseFloat(
      (taRecord['Premium'] || taRecord['Annual Premium'] || taRecord['Face Amount'] || 
       taRecord.premium || '0').toString().replace(/[$,]/g, '')
    );
    const phqAmount = parseFloat(phqRecord.premium || 0);
    if (taAmount > 0 && phqAmount > 0) {
      const diff = Math.abs(taAmount - phqAmount) / phqAmount;
      if (diff === 0) {
        score += 25;
        reasons.push('premium_exact');
      } else if (diff <= CONFIG.premiumTolerance) {
        score += 15;
        reasons.push('premium_fuzzy');
      }
    }
    
    // Product type match
    const taProduct = (taRecord['Product'] || taRecord['Plan'] || taRecord.product || '').toLowerCase();
    const phqProduct = (phqRecord.product_type || '').toLowerCase();
    if (taProduct && phqProduct) {
      if (taProduct.includes(phqProduct) || phqProduct.includes(taProduct)) {
        score += 10;
        reasons.push('product_match');
      }
    }
    
    // Date proximity
    const taDate = new Date(
      taRecord['Issue Date'] || taRecord['App Date'] || taRecord['Effective Date'] || 
      taRecord.date || ''
    );
    const phqDate = new Date(phqRecord.submission_date || '');
    if (!isNaN(taDate) && !isNaN(phqDate)) {
      const daysDiff = Math.abs(taDate - phqDate) / (1000 * 60 * 60 * 24);
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
 * Determine action based on TransAmerica status vs PolicyHQ status
 */
function determineAction(taStatus, phqStatus) {
  const normalized = `${(taStatus || '').toLowerCase().trim()}|${(phqStatus || '').toLowerCase().trim()}`;
  
  const actionMap = {
    'in force|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'in force|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'issued|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'issued|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'active|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'active|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'declined|submitted': { action: 'ALERT_AGENT', reason: 'Application declined by TransAmerica', priority: 'high' },
    'declined|pending': { action: 'ALERT_AGENT', reason: 'Application declined by TransAmerica', priority: 'high' },
    'not taken|submitted': { action: 'ALERT_AGENT', reason: 'Policy not taken', priority: 'normal' },
    'not taken|pending': { action: 'ALERT_AGENT', reason: 'Policy not taken', priority: 'normal' },
    'lapsed|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'lapsed|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'lapsed|in force': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'cancelled|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled', priority: 'urgent' },
    'cancelled|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled', priority: 'urgent' },
    'terminated|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy terminated', priority: 'urgent' },
    'terminated|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy terminated', priority: 'urgent' },
    'withdrawn|submitted': { action: 'UPDATE_STATUS', newStatus: 'withdrawn', priority: 'normal' },
    'withdrawn|pending': { action: 'UPDATE_STATUS', newStatus: 'withdrawn', priority: 'normal' },
    'pending|submitted': { action: 'INFO_ONLY', note: 'Still in underwriting', priority: 'low' },
  };
  
  return actionMap[normalized] || { action: 'MANUAL_REVIEW', priority: 'normal' };
}

/**
 * Analyze correspondences for actionable items
 */
function analyzeCorrespondences(correspondences) {
  const actionable = [];
  const keywords = {
    urgent: ['lapse', 'cancel', 'terminate', 'chargeback', 'final notice', 'grace period'],
    high: ['decline', 'not taken', 'requirement', 'missing information', 'additional info'],
    normal: ['issued', 'approved', 'welcome', 'confirmation', 'statement'],
  };
  
  for (const corr of correspondences) {
    const text = (corr.raw || '').toLowerCase();
    let priority = 'low';
    let matchedKeywords = [];
    
    for (const [level, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (text.includes(word)) {
          priority = level;
          matchedKeywords.push(word);
        }
      }
    }
    
    if (matchedKeywords.length > 0) {
      actionable.push({ ...corr, priority, matchedKeywords });
    }
  }
  
  return actionable;
}

/**
 * Generate reconciliation report
 */
function generateReport(results, data) {
  const actionableCorr = analyzeCorrespondences(data.correspondences);
  
  return {
    generated: new Date().toISOString(),
    carrier: 'TransAmerica',
    portal: process.env.PORTAL || 'transact',
    dataLoaded: {
      commissionRecords: data.commissions.length,
      pendingRecords: data.pending.length,
      inForceRecords: data.inForce.length,
      statusChangeRecords: data.statusChanges.length,
      correspondences: data.correspondences.length,
    },
    summary: {
      totalRecords: results.length,
      matched: results.filter(r => r.match).length,
      unmatched: results.filter(r => !r.match).length,
      actionsRequired: results.filter(r => r.action?.action !== 'MANUAL_REVIEW' && r.action?.action !== 'INFO_ONLY').length,
      urgentAlerts: results.filter(r => r.action?.priority === 'urgent').length,
    },
    correspondenceAnalysis: {
      total: data.correspondences.length,
      actionable: actionableCorr.length,
      urgent: actionableCorr.filter(c => c.priority === 'urgent').length,
      items: actionableCorr,
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
  console.log('[RECONCILE] Starting TransAmerica reconciliation...');
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  const data = loadDownloadedData();
  console.log(`[RECONCILE] Loaded: ${data.commissions.length} commissions, ${data.pending.length} pending, ${data.inForce.length} in force, ${data.statusChanges.length} status changes, ${data.correspondences.length} correspondences`);
  
  // Fetch PolicyHQ records
  const now = Date.now();
  const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
  const policyHQRecords = await fetchPolicyHQRecords(sixtyDaysAgo, now);
  console.log(`[RECONCILE] Fetched ${policyHQRecords.length} PolicyHQ records`);
  
  // Combine all TransAmerica records
  const allRecords = [...data.pending, ...data.inForce, ...data.statusChanges];
  
  // Match and reconcile
  const results = allRecords.map(record => {
    const match = findMatch(record, policyHQRecords);
    const status = record['Status'] || record['_status'] || record.status || '';
    const action = match
      ? determineAction(status, match.policyHQRecord.status)
      : { action: 'NO_MATCH', priority: 'normal' };
    
    return { taRecord: record, match, action };
  });
  
  // Generate report
  const report = generateReport(results, data);
  
  // Save
  const reportPath = path.join(CONFIG.outputDir, `transamerica-reconciliation-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n[RECONCILE] ═══════════════════════════════════════════════════');
  console.log('[RECONCILE] TRANSAMERICA RECONCILIATION SUMMARY');
  console.log('[RECONCILE] ═══════════════════════════════════════════════════');
  console.log(`[RECONCILE]   Total Records:       ${report.summary.totalRecords}`);
  console.log(`[RECONCILE]   Matched:             ${report.summary.matched}`);
  console.log(`[RECONCILE]   Unmatched:           ${report.summary.unmatched}`);
  console.log(`[RECONCILE]   Actions Required:    ${report.summary.actionsRequired}`);
  console.log(`[RECONCILE]   URGENT Alerts:       ${report.summary.urgentAlerts}`);
  console.log(`[RECONCILE]   Correspondences:     ${report.correspondenceAnalysis.actionable} actionable`);
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
