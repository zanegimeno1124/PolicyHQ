/**
 * Mutual of Omaha - Sales Professional Access (SPA) Login Automation
 * 
 * Handles authentication to producer.mutualofomaha.com via the SAML SSO flow.
 * Saves authenticated session state for reuse by other scripts.
 * 
 * Portal: https://producer.mutualofomaha.com/enterprise/myportal
 * Login:  https://accounts.mutualofomaha.com/samlAuthnRequest
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const CONFIG = {
  username: process.env.MOO_USERNAME,
  password: process.env.MOO_PASSWORD,
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  storageStatePath: path.resolve('./auth-state/moo-session.json'),
  portalUrl: 'https://producer.mutualofomaha.com/enterprise/myportal',
  loginUrl: 'https://accounts.mutualofomaha.com',
};

/**
 * Validates that required credentials are configured
 */
function validateConfig() {
  if (!CONFIG.username || !CONFIG.password) {
    throw new Error(
      'Missing credentials. Set MOO_USERNAME and MOO_PASSWORD in .env file.\n' +
      'Copy .env.example to .env and fill in your Sales Professional Access credentials.'
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
 * Performs login to Mutual of Omaha Sales Professional Access
 * Returns the authenticated browser context
 */
export async function login(options = {}) {
  validateConfig();
  
  const { forceLogin = false, keepOpen = false } = options;
  
  // Reuse existing session if valid
  if (!forceLogin && hasValidSession()) {
    console.log('[MOO] Reusing existing authenticated session');
    const browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
    });
    const context = await browser.newContext({
      storageState: CONFIG.storageStatePath,
    });
    return { browser, context, page: await context.newPage() };
  }

  console.log('[MOO] Starting fresh login to Sales Professional Access...');
  
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
    // Step 1: Navigate to the portal (triggers SAML redirect to login page)
    console.log('[MOO] Navigating to portal...');
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle' });
    
    // Step 2: Wait for the login form to appear
    // The page redirects to accounts.mutualofomaha.com/samlAuthnRequest
    console.log('[MOO] Waiting for login form...');
    await page.waitForSelector('input[type="text"], input[type="email"], input[name="username"]', {
      timeout: CONFIG.timeout,
    });
    
    // Step 3: Fill in credentials
    console.log('[MOO] Entering credentials...');
    
    // Username field - try multiple selectors for robustness
    const usernameField = await page.locator(
      'input[type="text"], input[type="email"], input[name="username"], input[name="j_username"]'
    ).first();
    await usernameField.fill(CONFIG.username);
    
    // Password field
    const passwordField = await page.locator(
      'input[type="password"], input[name="password"], input[name="j_password"]'
    ).first();
    await passwordField.fill(CONFIG.password);
    
    // Step 4: Click Sign In button
    console.log('[MOO] Submitting login...');
    const signInButton = await page.locator(
      'button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Log In"), input[type="submit"]'
    ).first();
    await signInButton.click();
    
    // Step 5: Wait for successful redirect back to the portal
    console.log('[MOO] Waiting for portal to load after authentication...');
    await page.waitForURL('**/producer.mutualofomaha.com/**', {
      timeout: CONFIG.timeout,
      waitUntil: 'networkidle',
    });
    
    // Step 6: Handle potential MFA / security questions
    // Check if we're still on a challenge page
    const currentUrl = page.url();
    if (currentUrl.includes('accounts.mutualofomaha.com')) {
      console.log('[MOO] Additional authentication step detected (MFA/security question)...');
      console.log('[MOO] Current URL:', currentUrl);
      
      // Check for common MFA patterns
      const mfaInput = await page.locator('input[name="otp"], input[name="code"], input[type="tel"]').first();
      if (await mfaInput.isVisible().catch(() => false)) {
        console.log('[MOO] MFA code required. Please enter the code manually.');
        // In automated mode, you would integrate with an MFA provider here
        // For now, wait for manual input in non-headless mode
        if (!CONFIG.headless) {
          await page.waitForURL('**/producer.mutualofomaha.com/**', {
            timeout: 120000, // 2 minutes for manual MFA entry
          });
        } else {
          throw new Error('MFA required but running in headless mode. Run with HEADLESS=false for manual MFA entry.');
        }
      }
    }
    
    // Step 7: Verify we're logged in by checking for portal elements
    console.log('[MOO] Verifying successful login...');
    await page.waitForSelector('a, nav, [role="navigation"]', { timeout: 30000 });
    
    // Step 8: Save session state for reuse
    const authDir = path.dirname(CONFIG.storageStatePath);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: CONFIG.storageStatePath });
    console.log('[MOO] Session state saved to:', CONFIG.storageStatePath);
    
    console.log('[MOO] Login successful!');
    console.log('[MOO] Current URL:', page.url());
    
    if (!keepOpen) {
      return { browser, context, page };
    }
    
    return { browser, context, page };
    
  } catch (error) {
    console.error('[MOO] Login failed:', error.message);
    
    // Take a screenshot for debugging
    const screenshotDir = './debug-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `login-error-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('[MOO] Debug screenshot saved to:', screenshotPath);
    
    await browser.close();
    throw error;
  }
}

/**
 * Quick session validation - checks if saved session can access the portal
 */
export async function validateSession() {
  if (!hasValidSession()) return false;
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      storageState: CONFIG.storageStatePath,
    });
    const page = await context.newPage();
    
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // If we get redirected to login, session is invalid
    const url = page.url();
    const isValid = !url.includes('accounts.mutualofomaha.com') && url.includes('producer.mutualofomaha.com');
    
    await browser.close();
    return isValid;
  } catch {
    await browser.close();
    return false;
  }
}

// Run directly if called as main script
if (process.argv[1] && process.argv[1].includes('login.js')) {
  try {
    const { browser, page } = await login({ forceLogin: true });
    console.log('\n[MOO] Login complete. Portal URL:', page.url());
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n[MOO] Fatal error:', error.message);
    process.exit(1);
  }
}
