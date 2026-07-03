/**
 * Ethos Life - PolicyHQ Reconciliation Engine
 * 
 * Matches downloaded Ethos data against PolicyHQ records to:
 * 1. Confirm policy activation (Ethos says active → update PolicyHQ)
 * 2. Detect chargebacks (Ethos says lapsed → alert agent)
 * 3. Reconcile commissions (Ethos paid vs. PolicyHQ expected)
 * 4. Flag discrepancies for manual review
 * 
 * Ethos-Specific Notes:
 * - Ethos provides instant decisions for 90% of applicants
 * - Commissions paid weekly (as earned) for activated policies
 * - Monthly bonuses and referrals
 * - Ethos is a platform that uses multiple underlying carriers
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
 * Fetch Ethos policies from PolicyHQ
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
 * Parse downloaded data files
 */
function loadDownloadedData() {
  const data = { earnings: [], customers: [], statusChanges: [] };
  
  const findJsonFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findJsonFiles(fullPath));
      } else if (item.endsWith('.json')) {
        files.push(fullPath);
      }
    }
    return files;
  };
  
  const files = findJsonFiles(CONFIG.downloadDir);
  
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const filename = path.basename(file).toLowerCase();
      
      if (filename.includes('earning') || filename.includes('commission')) {
        if (Array.isArray(content)) {
          data.earnings.push(...content);
        } else if (content.data) {
          data.earnings.push(content);
        }
      } else if (filename.includes('customer') || filename.includes('client')) {
        if (Array.isArray(content)) {
          data.customers.push(...content);
        }
      } else if (filename.includes('status')) {
        if (Array.isArray(content)) {
          data.statusChanges.push(...content);
        }
      }
    } catch (e) {
      console.warn(`[RECONCILE] Could not parse ${file}:`, e.message);
    }
  }
  
  return data;
}

/**
 * Match an Ethos record against PolicyHQ records
 */
function findMatch(ethosRecord, policyHQRecords) {
  const matches = [];
  
  for (const phqRecord of policyHQRecords) {
    let score = 0;
    const reasons = [];
    
    // Policy/application number match
    const ethosId = ethosRecord.policyNumber || ethosRecord.applicationId || ethosRecord.id;
    if (ethosId && phqRecord.policy_number) {
      if (ethosId === phqRecord.policy_number) {
        score += 100;
        reasons.push('policy_number_exact');
      }
    }
    
    // Client name match
    const ethosName = (ethosRecord.clientName || ethosRecord.name || '').toLowerCase().trim();
    const phqName = (phqRecord.client_name || '').toLowerCase().trim();
    if (ethosName && phqName) {
      if (ethosName === phqName) {
        score += 30;
        reasons.push('client_name_exact');
      } else if (ethosName.includes(phqName) || phqName.includes(ethosName)) {
        score += 20;
        reasons.push('client_name_partial');
      }
    }
    
    // Premium/amount match
    const ethosAmount = parseFloat(ethosRecord.premium || ethosRecord.amount || 0);
    const phqAmount = parseFloat(phqRecord.premium || 0);
    if (ethosAmount > 0 && phqAmount > 0) {
      const diff = Math.abs(ethosAmount - phqAmount) / phqAmount;
      if (diff === 0) {
        score += 25;
        reasons.push('premium_exact');
      } else if (diff <= CONFIG.premiumTolerance) {
        score += 15;
        reasons.push('premium_fuzzy');
      }
    }
    
    // Agent match
    const ethosAgent = ethosRecord.agentNPN || ethosRecord.agent;
    if (ethosAgent && phqRecord.agent_npn) {
      if (ethosAgent === phqRecord.agent_npn) {
        score += 25;
        reasons.push('agent_match');
      }
    }
    
    // Date proximity
    const ethosDate = new Date(ethosRecord.date || ethosRecord.effectiveDate || ethosRecord.createdAt);
    const phqDate = new Date(phqRecord.submission_date);
    if (!isNaN(ethosDate) && !isNaN(phqDate)) {
      const daysDiff = Math.abs(ethosDate - phqDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 7) {
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
 * Determine action based on status comparison
 */
function determineAction(ethosStatus, phqStatus) {
  const normalized = `${(ethosStatus || '').toLowerCase()}|${(phqStatus || '').toLowerCase()}`;
  
  const actionMap = {
    'active|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'active|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'activated|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'activated|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'declined|submitted': { action: 'ALERT_AGENT', reason: 'Application declined', priority: 'high' },
    'declined|pending': { action: 'ALERT_AGENT', reason: 'Application declined', priority: 'high' },
    'lapsed|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'lapsed|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'cancelled|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled', priority: 'urgent' },
    'cancelled|active': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled', priority: 'urgent' },
    'withdrawn|submitted': { action: 'UPDATE_STATUS', newStatus: 'withdrawn', priority: 'normal' },
  };
  
  return actionMap[normalized] || { action: 'MANUAL_REVIEW', priority: 'normal' };
}

/**
 * Generate reconciliation report
 */
function generateReport(results, data) {
  return {
    generated: new Date().toISOString(),
    carrier: 'Ethos Life',
    dataLoaded: {
      earningsRecords: data.earnings.length,
      customerRecords: data.customers.length,
      statusChangeRecords: data.statusChanges.length,
    },
    summary: {
      totalRecords: results.length,
      matched: results.filter(r => r.match).length,
      unmatched: results.filter(r => !r.match).length,
      actionsRequired: results.filter(r => r.action?.action !== 'MANUAL_REVIEW').length,
      urgentAlerts: results.filter(r => r.action?.priority === 'urgent').length,
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
  console.log('[RECONCILE] Starting Ethos Life reconciliation...');
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Load downloaded data
  const data = loadDownloadedData();
  console.log(`[RECONCILE] Loaded: ${data.earnings.length} earnings, ${data.customers.length} customers, ${data.statusChanges.length} status changes`);
  
  // Fetch PolicyHQ records
  const now = Date.now();
  const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
  const policyHQRecords = await fetchPolicyHQRecords(sixtyDaysAgo, now);
  console.log(`[RECONCILE] Fetched ${policyHQRecords.length} PolicyHQ records`);
  
  // Combine all Ethos records for matching
  const allRecords = [...data.customers, ...data.statusChanges.flatMap(s => s.items || [])];
  
  // Match and reconcile
  const results = allRecords.map(record => {
    const match = findMatch(record, policyHQRecords);
    const action = match
      ? determineAction(record.status, match.policyHQRecord.status)
      : { action: 'NO_MATCH', priority: 'normal' };
    
    return { ethosRecord: record, match, action };
  });
  
  // Generate report
  const report = generateReport(results, data);
  
  // Save
  const reportPath = path.join(CONFIG.outputDir, `ethos-reconciliation-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n[RECONCILE] ═══════════════════════════════════════════════════');
  console.log('[RECONCILE] ETHOS RECONCILIATION SUMMARY');
  console.log('[RECONCILE] ═══════════════════════════════════════════════════');
  console.log(`[RECONCILE]   Total Records:     ${report.summary.totalRecords}`);
  console.log(`[RECONCILE]   Matched:           ${report.summary.matched}`);
  console.log(`[RECONCILE]   Unmatched:         ${report.summary.unmatched}`);
  console.log(`[RECONCILE]   Actions Required:  ${report.summary.actionsRequired}`);
  console.log(`[RECONCILE]   URGENT Alerts:     ${report.summary.urgentAlerts}`);
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
