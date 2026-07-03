/**
 * Americo Financial - Agent Portal Login Automation
 * 
 * Handles authentication to the Americo agent portal at portal.americoagent.com.
 * Americo uses a traditional server-rendered portal with username/password login.
 * 
 * Portal: https://portal.americoagent.com
 * Auth: Username + Password (standard form-based login)
 * Session: Cookie-based with "Remember me" option
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const CONFIG = {
  username: process.env.AMERICO_USERNAME,
  password: process.env.AMERICO_PASSWORD,
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  storageStatePath: path.resolve('./auth-state/americo-session.json'),
  portalUrl: 'https://portal.americoagent.com',
};

/**
 * Validates that required credentials are configured
 */
function validateConfig() {
  if (!CONFIG.username || !CONFIG.password) {
    throw new Error(
      'Missing credentials. Set AMERICO_USERNAME and AMERICO_PASSWORD in .env file.\n' +
      'Copy .env.example to .env and fill in your Americo agent portal credentials.\n' +
      'If you don\'t have an account, register at: https://account.americoagent.com/AgentRegistration'
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
  const maxAgeMs = 4 * 60 * 60 * 1000; // 4 hours
  
  return ageMs < maxAgeMs;
}

/**
 * Performs login to Americo agent portal
 */
export async function login(options = {}) {
  validateConfig();
  
  const { forceLogin = false, keepOpen = false } = options;
  
  // Reuse existing session if valid
  if (!forceLogin && hasValidSession()) {
    console.log('[AMERICO] Reusing existing authenticated session');
    const browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
    });
    const context = await browser.newContext({
      storageState: CONFIG.storageStatePath,
    });
    const page = await context.newPage();
    
    // Verify session is still valid
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
    const url = page.url();
    
    // If redirected to login page, session expired
    const hasLoginForm = await page.locator('input[type="password"]').isVisible().catch(() => false);
    if (hasLoginForm || url.includes('login') || url.includes('Login')) {
      console.log('[AMERICO] Saved session expired, performing fresh login...');
      await browser.close();
      return login({ forceLogin: true, keepOpen });
    }
    
    return { browser, context, page };
  }

  console.log('[AMERICO] Starting fresh login to Americo agent portal...');
  
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
    // Step 1: Navigate to the portal
    console.log('[AMERICO] Navigating to portal...');
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle' });
    
    // Step 2: Wait for login form
    console.log('[AMERICO] Waiting for login form...');
    await page.waitForSelector(
      'input[name*="user" i], input[name*="User" i], input[id*="user" i], input[placeholder*="User" i]',
      { timeout: 15000 }
    );
    
    // Step 3: Fill username
    console.log('[AMERICO] Entering username...');
    const usernameField = page.locator(
      'input[name*="user" i], input[name*="User" i], input[id*="user" i], input[placeholder*="User" i], input[type="text"]:first-of-type'
    ).first();
    await usernameField.fill(CONFIG.username);
    
    // Step 4: Fill password
    console.log('[AMERICO] Entering password...');
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill(CONFIG.password);
    
    // Step 5: Check "Remember me" if available
    const rememberMe = page.locator(
      'input[type="checkbox"][name*="remember" i], input[type="checkbox"][id*="remember" i], label:has-text("Remember")'
    ).first();
    if (await rememberMe.isVisible().catch(() => false)) {
      await rememberMe.check().catch(() => {});
    }
    
    // Step 6: Click Sign In button
    console.log('[AMERICO] Submitting login...');
    const signInButton = page.locator(
      'button:has-text("Sign In"), input[type="submit"][value*="Sign" i], button[type="submit"], a:has-text("Sign In")'
    ).first();
    await signInButton.click();
    
    // Step 7: Wait for portal to load (should redirect to dashboard)
    console.log('[AMERICO] Waiting for portal dashboard...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Verify we're logged in - look for portal content
    const isLoggedIn = await page.locator(
      'text=Commission, text=Pending, text=Welcome, nav, [class*="menu"], [class*="nav"]'
    ).first().isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Check for error messages
      const errorMsg = await page.locator(
        '[class*="error"], [class*="alert"], text=Invalid, text=incorrect, text=failed'
      ).first().textContent().catch(() => null);
      
      if (errorMsg) {
        throw new Error(`Login failed: ${errorMsg}`);
      }
      
      // Maybe the page is still loading
      await page.waitForTimeout(5000);
    }
    
    // Step 8: Save session state
    const authDir = path.dirname(CONFIG.storageStatePath);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: CONFIG.storageStatePath });
    console.log('[AMERICO] Session state saved');
    
    console.log('[AMERICO] Login successful!');
    console.log('[AMERICO] Current URL:', page.url());
    
    return { browser, context, page };
    
  } catch (error) {
    console.error('[AMERICO] Login failed:', error.message);
    
    // Save debug screenshot
    const screenshotDir = './debug-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `americo-login-error-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('[AMERICO] Debug screenshot saved to:', screenshotPath);
    
    await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('login.js')) {
  try {
    const { browser, page } = await login({ forceLogin: true });
    console.log('\n[AMERICO] Login complete. Portal URL:', page.url());
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n[AMERICO] Fatal error:', error.message);
    process.exit(1);
  }
}
