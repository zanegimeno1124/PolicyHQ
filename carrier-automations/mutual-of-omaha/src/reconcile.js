/**
 * Mutual of Omaha - PolicyHQ Reconciliation Engine
 * 
 * Matches downloaded carrier data against PolicyHQ records to:
 * 1. Confirm policy issuance (carrier says issued → update PolicyHQ)
 * 2. Detect chargebacks (carrier says lapsed → alert agent)
 * 3. Reconcile commissions (carrier paid vs. PolicyHQ expected)
 * 4. Flag discrepancies for manual review
 * 
 * Match Strategy:
 * - Primary: Policy Number (if available from carrier)
 * - Secondary: Agent NPN + Client Name + Premium Amount + Date
 * - Fuzzy: Agent NPN + Premium Amount (within 5% tolerance)
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
  premiumTolerance: 0.05, // 5% tolerance for fuzzy matching
};

/**
 * Fetch policies from PolicyHQ for a given carrier and date range
 */
async function fetchPolicyHQRecords(carrierId, startDate, endDate) {
  if (!CONFIG.policyHqToken) {
    console.warn('[RECONCILE] No PolicyHQ token configured. Using mock data.');
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
    
    if (!response.ok) {
      throw new Error(`PolicyHQ API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[RECONCILE] Failed to fetch PolicyHQ records:', error.message);
    return [];
  }
}

/**
 * Parse downloaded commission statement data
 * Handles both PDF-extracted data and CSV formats
 */
function parseCommissionData(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (ext === '.json') {
    return JSON.parse(content);
  }
  
  if (ext === '.csv') {
    // Simple CSV parsing
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const record = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx] || '';
        });
        return record;
      });
  }
  
  // For PDF files, return empty (would need pdf-parse integration)
  console.warn(`[RECONCILE] Cannot parse ${ext} files directly. Use pdf-parse for PDFs.`);
  return [];
}

/**
 * Match a carrier record against PolicyHQ records
 */
function findMatch(carrierRecord, policyHQRecords) {
  const matches = [];
  
  for (const phqRecord of policyHQRecords) {
    let score = 0;
    const reasons = [];
    
    // Exact policy number match (highest confidence)
    if (carrierRecord.policyNumber && phqRecord.policy_number) {
      if (carrierRecord.policyNumber === phqRecord.policy_number) {
        score += 100;
        reasons.push('policy_number_exact');
      }
    }
    
    // Agent NPN match
    if (carrierRecord.agentNPN && phqRecord.agent_npn) {
      if (carrierRecord.agentNPN === phqRecord.agent_npn) {
        score += 30;
        reasons.push('agent_npn_match');
      }
    }
    
    // Premium amount match (within tolerance)
    if (carrierRecord.premium && phqRecord.premium) {
      const carrierPremium = parseFloat(carrierRecord.premium);
      const phqPremium = parseFloat(phqRecord.premium);
      const diff = Math.abs(carrierPremium - phqPremium) / phqPremium;
      
      if (diff === 0) {
        score += 25;
        reasons.push('premium_exact');
      } else if (diff <= CONFIG.premiumTolerance) {
        score += 15;
        reasons.push('premium_fuzzy');
      }
    }
    
    // Client name match (fuzzy)
    if (carrierRecord.clientName && phqRecord.client_name) {
      const carrierName = carrierRecord.clientName.toLowerCase().trim();
      const phqName = phqRecord.client_name.toLowerCase().trim();
      
      if (carrierName === phqName) {
        score += 25;
        reasons.push('client_name_exact');
      } else if (carrierName.includes(phqName) || phqName.includes(carrierName)) {
        score += 15;
        reasons.push('client_name_partial');
      }
    }
    
    // Date proximity (within 7 days)
    if (carrierRecord.effectiveDate && phqRecord.submission_date) {
      const carrierDate = new Date(carrierRecord.effectiveDate);
      const phqDate = new Date(phqRecord.submission_date);
      const daysDiff = Math.abs(carrierDate - phqDate) / (1000 * 60 * 60 * 24);
      
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
  
  // Return best match
  matches.sort((a, b) => b.score - a.score);
  return matches[0] || null;
}

/**
 * Determine what action to take based on carrier status vs PolicyHQ status
 */
function determineAction(carrierStatus, phqStatus) {
  const statusMap = {
    // Carrier says issued, PolicyHQ says pending → Update to issued
    'issued|submitted': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    'issued|pending': { action: 'UPDATE_STATUS', newStatus: 'issued', priority: 'normal' },
    
    // Carrier says declined → Alert agent
    'declined|submitted': { action: 'ALERT_AGENT', reason: 'Application declined by carrier', priority: 'high' },
    'declined|pending': { action: 'ALERT_AGENT', reason: 'Application declined by carrier', priority: 'high' },
    
    // Carrier says lapsed/cancelled → Chargeback alert
    'lapsed|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy lapsed - expect chargeback', priority: 'urgent' },
    'cancelled|issued': { action: 'CHARGEBACK_ALERT', reason: 'Policy cancelled - expect chargeback', priority: 'urgent' },
    'lapsed|active': { action: 'CHARGEBACK_ALERT', reason: 'Active policy lapsed', priority: 'urgent' },
    
    // Carrier says withdrawn → Update and alert
    'withdrawn|submitted': { action: 'UPDATE_STATUS', newStatus: 'withdrawn', priority: 'normal' },
    'withdrawn|pending': { action: 'UPDATE_STATUS', newStatus: 'withdrawn', priority: 'normal' },
    
    // Commission paid → Confirm payment
    'paid|issued': { action: 'CONFIRM_COMMISSION', priority: 'low' },
  };
  
  const key = `${carrierStatus?.toLowerCase()}|${phqStatus?.toLowerCase()}`;
  return statusMap[key] || { action: 'MANUAL_REVIEW', priority: 'normal' };
}

/**
 * Generate reconciliation report
 */
function generateReport(results) {
  const report = {
    generated: new Date().toISOString(),
    carrier: 'Mutual of Omaha',
    summary: {
      totalCarrierRecords: results.length,
      matched: results.filter(r => r.match).length,
      unmatched: results.filter(r => !r.match).length,
      actionsRequired: results.filter(r => r.action && r.action.action !== 'MANUAL_REVIEW').length,
      urgentAlerts: results.filter(r => r.action?.priority === 'urgent').length,
    },
    actions: {
      statusUpdates: results.filter(r => r.action?.action === 'UPDATE_STATUS'),
      chargebackAlerts: results.filter(r => r.action?.action === 'CHARGEBACK_ALERT'),
      agentAlerts: results.filter(r => r.action?.action === 'ALERT_AGENT'),
      commissionConfirmations: results.filter(r => r.action?.action === 'CONFIRM_COMMISSION'),
      manualReview: results.filter(r => r.action?.action === 'MANUAL_REVIEW'),
    },
    details: results,
  };
  
  return report;
}

/**
 * Main reconciliation process
 */
export async function reconcile() {
  console.log('[RECONCILE] Starting Mutual of Omaha reconciliation...');
  
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Load downloaded data
  const downloadDir = CONFIG.downloadDir;
  const dataFiles = [];
  
  if (fs.existsSync(downloadDir)) {
    const findFiles = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findFiles(fullPath);
        } else if (item.endsWith('.json') || item.endsWith('.csv')) {
          dataFiles.push(fullPath);
        }
      }
    };
    findFiles(downloadDir);
  }
  
  console.log(`[RECONCILE] Found ${dataFiles.length} data files to process`);
  
  // Parse all carrier data
  const carrierRecords = [];
  for (const file of dataFiles) {
    try {
      const records = parseCommissionData(file);
      if (Array.isArray(records)) {
        carrierRecords.push(...records);
      }
    } catch (error) {
      console.warn(`[RECONCILE] Could not parse ${file}:`, error.message);
    }
  }
  
  console.log(`[RECONCILE] Parsed ${carrierRecords.length} carrier records`);
  
  // Fetch PolicyHQ records for comparison
  const now = Date.now();
  const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
  const policyHQRecords = await fetchPolicyHQRecords('mutual-of-omaha', sixtyDaysAgo, now);
  
  console.log(`[RECONCILE] Fetched ${policyHQRecords.length} PolicyHQ records`);
  
  // Match and reconcile
  const results = carrierRecords.map(carrierRecord => {
    const match = findMatch(carrierRecord, policyHQRecords);
    const action = match 
      ? determineAction(carrierRecord.status, match.policyHQRecord.status)
      : { action: 'NO_MATCH', priority: 'normal' };
    
    return {
      carrierRecord,
      match,
      action,
    };
  });
  
  // Generate report
  const report = generateReport(results);
  
  // Save report
  const reportPath = path.join(CONFIG.outputDir, `reconciliation-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n[RECONCILE] ═══════════════════════════════════════════════════');
  console.log('[RECONCILE] RECONCILIATION SUMMARY');
  console.log('[RECONCILE] ═══════════════════════════════════════════════════');
  console.log(`[RECONCILE]   Total Records:        ${report.summary.totalCarrierRecords}`);
  console.log(`[RECONCILE]   Matched:              ${report.summary.matched}`);
  console.log(`[RECONCILE]   Unmatched:            ${report.summary.unmatched}`);
  console.log(`[RECONCILE]   Actions Required:     ${report.summary.actionsRequired}`);
  console.log(`[RECONCILE]   URGENT Alerts:        ${report.summary.urgentAlerts}`);
  console.log('[RECONCILE] ───────────────────────────────────────────────────');
  console.log(`[RECONCILE]   Status Updates:       ${report.actions.statusUpdates.length}`);
  console.log(`[RECONCILE]   Chargeback Alerts:    ${report.actions.chargebackAlerts.length}`);
  console.log(`[RECONCILE]   Agent Alerts:         ${report.actions.agentAlerts.length}`);
  console.log(`[RECONCILE]   Commission Confirms:  ${report.actions.commissionConfirmations.length}`);
  console.log(`[RECONCILE]   Manual Review:        ${report.actions.manualReview.length}`);
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
