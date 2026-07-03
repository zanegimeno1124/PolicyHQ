/**
 * Ethos Life - Agent Portal Login Automation
 * 
 * Handles authentication to the Ethos agent portal (agents.ethoslife.com).
 * Ethos uses a modern React SPA with Cloudflare protection, so a real
 * browser context is required (no simple HTTP requests).
 * 
 * Portal: https://agents.ethoslife.com (redirects to app.ethos.com)
 * Auth: Email + Password (standard form-based login)
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const CONFIG = {
  email: process.env.ETHOS_EMAIL,
  password: process.env.ETHOS_PASSWORD,
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  timeout: parseInt(process.env.TIMEOUT || '60000'),
  storageStatePath: path.resolve('./auth-state/ethos-session.json'),
  portalUrl: 'https://agents.ethoslife.com',
  loginUrls: [
    'https://agents.ethoslife.com',
    'https://app.ethos.com/agent/login',
    'https://app.ethos.com/login',
  ],
};

/**
 * Validates that required credentials are configured
 */
function validateConfig() {
  if (!CONFIG.email || !CONFIG.password) {
    throw new Error(
      'Missing credentials. Set ETHOS_EMAIL and ETHOS_PASSWORD in .env file.\n' +
      'Copy .env.example to .env and fill in your Ethos agent portal credentials.'
    );
  }
}

/**
 * Checks if a saved session exists and is still valid (less than 2 hours old)
 */
function hasValidSession() {
  if (!fs.existsSync(CONFIG.storageStatePath)) return false;
  
  const stats = fs.statSync(CONFIG.storageStatePath);
  const ageMs = Date.now() - stats.mtimeMs;
  const maxAgeMs = 2 * 60 * 60 * 1000; // 2 hours (Ethos sessions may be shorter)
  
  return ageMs < maxAgeMs;
}

/**
 * Performs login to Ethos agent portal
 * Returns the authenticated browser context
 */
export async function login(options = {}) {
  validateConfig();
  
  const { forceLogin = false, keepOpen = false } = options;
  
  // Reuse existing session if valid
  if (!forceLogin && hasValidSession()) {
    console.log('[ETHOS] Reusing existing authenticated session');
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
    if (url.includes('login') || url.includes('sign-in') || url.includes('signin')) {
      console.log('[ETHOS] Saved session expired, performing fresh login...');
      await browser.close();
      return login({ forceLogin: true, keepOpen });
    }
    
    return { browser, context, page };
  }

  console.log('[ETHOS] Starting fresh login to Ethos agent portal...');
  
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
    // Step 1: Navigate to the agent portal
    console.log('[ETHOS] Navigating to agent portal...');
    let loginPageReached = false;
    
    for (const url of CONFIG.loginUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        // Check if we got a login form
        const hasLoginForm = await page.locator(
          'input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]'
        ).first().isVisible().catch(() => false);
        
        if (hasLoginForm) {
          loginPageReached = true;
          console.log('[ETHOS] Login page reached at:', url);
          break;
        }
        
        // Check for Cloudflare challenge
        const isCloudflare = await page.locator('text=Checking your browser').isVisible().catch(() => false);
        if (isCloudflare) {
          console.log('[ETHOS] Cloudflare challenge detected, waiting...');
          await page.waitForTimeout(5000);
          // After challenge, check again
          const hasForm = await page.locator('input[type="email"], input[name="email"]').first().isVisible().catch(() => false);
          if (hasForm) {
            loginPageReached = true;
            break;
          }
        }
      } catch (e) {
        console.log(`[ETHOS] URL ${url} failed: ${e.message}`);
        continue;
      }
    }
    
    if (!loginPageReached) {
      // Try waiting longer for the SPA to load
      console.log('[ETHOS] Waiting for SPA to fully render...');
      await page.waitForTimeout(5000);
    }
    
    // Step 2: Wait for and fill the login form
    console.log('[ETHOS] Looking for login form...');
    
    // Ethos is a React SPA - the login form may take time to render
    await page.waitForSelector(
      'input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"], input[type="text"][name*="user"]',
      { timeout: 30000 }
    );
    
    // Step 3: Fill email
    console.log('[ETHOS] Entering email...');
    const emailField = await page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"], input[type="text"][name*="user"]'
    ).first();
    await emailField.fill(CONFIG.email);
    
    // Step 4: Fill password
    console.log('[ETHOS] Entering password...');
    const passwordField = await page.locator(
      'input[type="password"], input[name="password"]'
    ).first();
    
    // Some portals show password field after email is entered
    if (!await passwordField.isVisible().catch(() => false)) {
      // Click next/continue button first
      const nextButton = await page.locator(
        'button:has-text("Next"), button:has-text("Continue"), button[type="submit"]'
      ).first();
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(2000);
      }
      await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    }
    
    await page.locator('input[type="password"]').first().fill(CONFIG.password);
    
    // Step 5: Click login/sign-in button
    console.log('[ETHOS] Submitting login...');
    const loginButton = await page.locator(
      'button:has-text("Log in"), button:has-text("Log In"), button:has-text("Sign in"), button:has-text("Sign In"), button[type="submit"]'
    ).first();
    await loginButton.click();
    
    // Step 6: Wait for successful login (portal dashboard loads)
    console.log('[ETHOS] Waiting for portal dashboard...');
    await page.waitForURL(url => {
      return !url.includes('login') && !url.includes('sign-in') && !url.includes('signin');
    }, { timeout: CONFIG.timeout });
    
    // Additional wait for SPA to fully hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Step 7: Verify we're in the portal (look for sidebar navigation)
    const isLoggedIn = await page.locator(
      'text=Home, text=Earnings, text=Customers, text=Performance, nav, [role="navigation"]'
    ).first().isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Check if there's an error message
      const errorMsg = await page.locator(
        '[class*="error"], [role="alert"], text=Invalid, text=incorrect'
      ).first().textContent().catch(() => null);
      
      if (errorMsg) {
        throw new Error(`Login failed: ${errorMsg}`);
      }
    }
    
    // Step 8: Save session state
    const authDir = path.dirname(CONFIG.storageStatePath);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await context.storageState({ path: CONFIG.storageStatePath });
    console.log('[ETHOS] Session state saved');
    
    console.log('[ETHOS] Login successful!');
    console.log('[ETHOS] Current URL:', page.url());
    
    return { browser, context, page };
    
  } catch (error) {
    console.error('[ETHOS] Login failed:', error.message);
    
    // Save debug screenshot
    const screenshotDir = './debug-screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `ethos-login-error-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error('[ETHOS] Debug screenshot saved to:', screenshotPath);
    
    await browser.close();
    throw error;
  }
}

// Run directly
if (process.argv[1] && process.argv[1].includes('login.js')) {
  try {
    const { browser, page } = await login({ forceLogin: true });
    console.log('\n[ETHOS] Login complete. Portal URL:', page.url());
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n[ETHOS] Fatal error:', error.message);
    process.exit(1);
  }
}
