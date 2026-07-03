/**
 * TransAmerica - Agent Portal Login Automation
 * 
 * Handles authentication to TransAmerica's agent portals. TransAmerica has
 * multiple portals; this script supports:
 * 
 * 1. TransACT (transact.transamerica.com) - Primary for financial professionals
 * 2. Agent Home (via transamerica.com) - SSO to Life Access portal
 * 3. TLIC (tlic.transamerica.com) - TransAmerica Life Insurance Company
 * 
 * All use standard User ID + Password authentication.
 * After login, session state is saved for reuse across download scripts.
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const PORTALS = {
  transact: {
    name: 'TransACT',
    url: 'https://transact.transamerica.com/',
    loginUrl: 'https://transact.transamerica.com/',
  },
  agent_home: {
    name: 'Agent Home',
    url: 'https://www.transamerica.com/login/financial-professional',
    loginUrl: 'https://www.transamerica.com/login/financial-professional',
  },
  tlic: {
    name: 'TLIC',
    url: 'https://tlic.transamerica.com/portal/public/tlc/login',
    loginUrl: 'https://tlic.transamerica.com/portal/public/tlc/login',
  },
};

const CONFIG = {
  userId: process.env.TRANSAMERICA_USER_ID,
  password: process.env.TRANSAMERICA_PASSWORD,
  portal: process.env.PORTAL || 'transact',
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  storageStatePath: path.resolve('./auth-state/transamerica-session.json'),
};

/**
 * Validates that required credentials are configured
 */
function validateConfig() {
  if (!CONFIG.userId || !CONFIG.password) {
    throw new Error(
      'Missing credentials. Set TRANSAMERICA_USER_ID and TRANSAMERICA_PASSWORD in .env file.\n' +
      'Copy .env.example to .env and fill in your TransAmerica portal credentials.\n' +
      'Register at: https://www.transamerica.com/create-account/financial-professional'
    );
  }
  
  if (!PORTALS[CONFIG.portal]) {
    throw new Error(
      `Invalid PORTAL value: "${CONFIG.portal}". Must be one of: transact, agent_home, tlic`
    );
  }
}

/**
 * Checks if a saved session exists and is still valid (less than 4 hours old)
 */
function hasValidSession() {
  if (!fs.existsSync(CONFIG.storageStatePath)) return false;
  
  const stats = fs.statSync(CONFIG.storageStatePath);
  const ageMs = Date.now() - stats.mtimeMs;
  const maxAgeMs = 4 * 60 * 60 * 1000;
  
  return ageMs < maxAgeMs;
}

/**
 * Get the portal configuration
 */
function getPortalConfig() {
  return PORTALS[CONFIG.portal];
}

/**
 * Performs login to TransACT portal
 */
async function loginTransACT(page) {
  const portal = PORTALS.transact;
  console.log(`[TRANSAMERICA] Navigating to ${portal.name}...`);
  
  await page.goto(portal.loginUrl, { waitUntil: 'networkidle' });
  
  // Wait for login form
  await page.waitForSelector(
    'input[name*="user" i], input[id*="user" i], input[name*="UserID" i], input[type="text"]',
    { timeout: 15000 }
  );
  
  // Fill User ID
  console.log('[TRANSAMERICA] Entering User ID...');
  const userIdField = page.locator(
    'input[name*="user" i], input[id*="user" i], input[name*="UserID" i], input[type="text"]:first-of-type'
  ).first();
  await userIdField.fill(CONFIG.userId);
  
  // Fill Password
  console.log('[TRANSAMERICA] Entering Password...');
  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.fill(CONFIG.password);
  
  // Submit
  console.log('[TRANSAMERICA] Submitting login...');
  const submitBtn = page.locator(
    'input[type="submit"], button[type="submit"], input[value*="Log" i], button:has-text("Log")'
  ).first();
  await submitBtn.click();
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

/**
 * Performs login to Agent Home / Life Access portal
 */
async function loginAgentHome(page) {
  const portal = PORTALS.agent_home;
  console.log(`[TRANSAMERICA] Navigating to ${portal.name}...`);
  
  await page.goto(portal.loginUrl, { waitUntil: 'networkidle' });
  
  // Look for the Agent Home link/button
  const agentHomeLink = page.locator(
    'a:has-text("Agent Home"), button:has-text("Agent Home"), a[href*="agent"]'
  ).first();
  
  if (await agentHomeLink.isVisible().catch(() => false)) {
    await agentHomeLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  
  // Wait for login form (may redirect to SSO page)
  await page.waitForSelector(
    'input[type="text"], input[type="email"], input[name*="user" i]',
    { timeout: 15000 }
  );
  
  // Fill credentials
  console.log('[TRANSAMERICA] Entering credentials...');
  const userField = page.locator(
    'input[name*="user" i], input[type="email"], input[type="text"]'
  ).first();
  await userField.fill(CONFIG.userId);
  
  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.fill(CONFIG.password);
  
  // Submit
  const submitBtn = page.locator(
    'button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Log")'
  ).first();
  await submitBtn.click();
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

/**
 * Performs login to TLIC portal
 */
async function loginTLIC(page) {
  const portal = PORTALS.tlic;
  console.log(`[TRANSAMERICA] Navigating to ${portal.name}...`);
  
  await page.goto(portal.loginUrl, { waitUntil: 'networkidle' });
  
  // Wait for login form
  await page.waitForSelector(
    'input[name*="user" i], input[id*="user" i], input[type="text"]',
    { timeout: 15000 }
  );
  
  // Fill User ID
  console.log('[TRANSAMERICA] Entering User ID...');
  const userIdField = page.locator(
    'input[name*="user" i], input[id*="user" i], input[type="text"]:first-of-type'
  ).first();
  await userIdField.fill(CONFIG.userId);
  
  // Fill Password
  console.log('[TRANSAMERICA] Entering Password...');
  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.fill(CONFIG.password);
  
  // Submit
  const submitBtn = page.locator(
    'input[type="submit"], button[type="submit"], input[value*="Log" i]'
  ).first();
  await submitBtn.click();
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

/**
 * Main login function
 */
export async function login(options = {}) {
  validateConfig();
  
  const { forceLogin = false, keepOpen = false } = options;
  const portalConfig = getPortalConfig();
  
  // Reuse existing session if valid
  if (!forceLogin && hasValidSession()) {
    console.log(`[TRANSAMERICA] Reusing existing session for ${portalConfig.name}`);
    const browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
    });
    const context = await browser.newContext({
      storageState: CONFIG.storageStatePath,
    });
    const page = await context.newPage();
    
    // Verify session
    await page.goto(portalConfig.url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
    
    const hasLoginForm = await page.locator('input[type="password"]').isVisible().catch(() => false);
    if (hasLoginForm) {
      console.log('[TRANSAMERICA] Saved session expired, performing fresh login...');
      await browser.close();
      return login({ forceLogin: true, keepOpen });
    }
    
    return { browser, context, page, portal: CONFIG.portal };
  }

  console.log(`[TRANSAMERICA] Starting fresh login to ${portalConfig.name}...`);
  
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  try {
    // Route to appropriate login handler
    switch (CONFIG.portal) {
      case 'transact':
        await loginTransACT(page);
        break;
      case 'agent_home':
        await loginAgentHome(page);
        break;
      case 'tlic':
        await loginTLIC(page);
        break;
    }
    
    // Verify login success
    const stillOnLogin = await page.locator('input[type="password"]').isVisible().catch(() => false);
    if (stillOnLogin) {
      const errorMsg = await page.locator(
        '[class*="error"], [class*="alert"], text=Invalid, text=incorrect, text=failed'
      ).first().textContent().catch(() => null);
      
      if (errorMsg) {
        throw new Error(`Login failed: ${errorMsg}`);
      }
      
      // Maybe MFA or additional step
      await page.waitForTimeout(5000);
    }
    
    // Save session state
    const authDir = path.dirname(CONFIG.storageStatePath);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: CONFIG.storageStatePath });
    console.log('[TRANSAMERICA] Session state saved');
    
    console.log('[TRANSAMERICA] Login successful!');
    console.log('[TRANSAMERICA] Current URL:', page.url());
    
    return { browser, context, page, portal: CONFIG.portal };
    
  } catch (error) {
    console.error('[TRANSAMERICA] Login failed:', error.message);
    
    const screenshotDir = './debug-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `transamerica-login-error-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('[TRANSAMERICA] Debug screenshot saved to:', screenshotPath);
    
    await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('login.js')) {
  try {
    const { browser, page, portal } = await login({ forceLogin: true });
    console.log(`\n[TRANSAMERICA] Login complete (${portal}). URL: ${page.url()}`);
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n[TRANSAMERICA] Fatal error:', error.message);
    process.exit(1);
  }
}
