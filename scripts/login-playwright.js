import { chromium } from "playwright";
import config from "../config/config.js";
import { logger } from "./utils/logger.js";
import { extractCaptcha } from "./utils/ocr.js";

/**
 * Login to TTD website using pure Playwright API
 */
export async function loginWithPlaywright() {
  logger.section("LAUNCHING BROWSER FOR LOGIN");
  
  const browser = await chromium.launch({
    headless: config.headless
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // Navigate to login page
    logger.info("Navigating to login page...");
    await page.goto(config.baseUrl + "/#/userLogin", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Take screenshot before login
    await page.screenshot({ path: "screenshots/01-login-page-loaded.png" });

    // Fill username using Playwright locator
    logger.info("Filling username field...");
    const usernameInput = page.locator('[name="uName"]');
    
    if (!(await usernameInput.isVisible())) {
      throw new Error("Username field not visible");
    }
    
    // Clear and fill username
    await usernameInput.fill("");
    await page.waitForTimeout(500);
    await usernameInput.type(config.username, { delay: 50 }); // Type with delay for AngularJS
    await page.waitForTimeout(500);
    
    logger.success(`✓ Username filled: ${config.username}`);
    await page.screenshot({ path: "screenshots/02-username-filled.png" });

    // Fill password
    logger.info("Filling password field...");
    const passwordInput = page.locator('[name="pwd"]');
    
    if (!(await passwordInput.isVisible())) {
      throw new Error("Password field not visible");
    }

    await passwordInput.fill("");
    await page.waitForTimeout(500);
    await passwordInput.type(config.password, { delay: 50 });
    await page.waitForTimeout(500);
    
    logger.success("✓ Password filled");
    await page.screenshot({ path: "screenshots/03-password-filled.png" });

    // Wait for CAPTCHA to load
    logger.info("Waiting for CAPTCHA...");
    await page.waitForTimeout(2000);

    // Check if CAPTCHA exists
    const captchaInput = page.locator('[name="txtInput"]');
    const captchaVisible = await captchaInput.isVisible().catch(() => false);

    if (!captchaVisible) {
      logger.warn("⚠️ CAPTCHA not found, attempting login without CAPTCHA...");
    } else {
      logger.info("CAPTCHA detected, starting OCR...");
      
      // Extract and fill CAPTCHA
      const captchaCode = await extractCaptcha(page);
      
      if (!captchaCode) {
        throw new Error("Could not extract CAPTCHA");
      }

      logger.success(`✓ CAPTCHA recognized: ${captchaCode}`);
      
      // Fill CAPTCHA
      await captchaInput.fill("");
      await page.waitForTimeout(300);
      await captchaInput.type(captchaCode, { delay: 50 });
      await page.waitForTimeout(300);
      
      logger.success("✓ CAPTCHA filled");
      await page.screenshot({ path: "screenshots/04-captcha-filled.png" });
    }

    // Click login button
    logger.info("Clicking login button...");
    const loginButton = page.locator('button:has-text("Login"), button[type="submit"]').first();
    
    if (!(await loginButton.isVisible())) {
      throw new Error("Login button not found");
    }

    await loginButton.click();
    logger.success("✓ Login button clicked");

    // Wait for navigation or form response
    logger.info("Waiting for login response...");
    
    let loginSuccess = false;
    let attempts = 0;
    const maxAttempts = 6; // Wait up to 30 seconds (5 sec * 6)

    while (attempts < maxAttempts && !loginSuccess) {
      await page.waitForTimeout(5000);
      attempts++;

      const currentUrl = page.url();
      logger.info(`Attempt ${attempts}: Current URL = ${currentUrl}`);

      // Check if login was successful
      if (currentUrl.includes("#/SrivaniDonationConfirm") || 
          currentUrl.includes("#/welcome") || 
          currentUrl.includes("#/bookingForm") ||
          currentUrl.includes("#/homepage")) {
        logger.success("✓ Login successful!");
        loginSuccess = true;
      }

      // Check for error messages
      const errorVisible = await page.locator('[class*="error"], [class*="alert"]').isVisible().catch(() => false);
      if (errorVisible && !loginSuccess && attempts > 1) {
        const errorText = await page.locator('[class*="error"]').first().textContent().catch(() => "");
        logger.error(`Login error: ${errorText}`);
      }
    }

    if (!loginSuccess) {
      logger.warn("Login verification inconclusive, proceeding anyway...");
    }

    await page.screenshot({ path: "screenshots/05-after-login.png" });

    // Navigate to donation page to ensure we're authenticated
    logger.info("Navigating to donation confirmation page...");
    await page.goto(config.baseUrl + "/#/SrivaniDonationConfirm", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/06-donation-page.png" });

    logger.success("✓ LOGIN FLOW COMPLETED");
    return { page, browser, success: true };

  } catch (error) {
    logger.error(`❌ Login failed: ${error.message}`);
    await page.screenshot({ path: "screenshots/error-login.png" }).catch(() => {});
    await browser.close();
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await loginWithPlaywright();
    logger.success("Login successful!");
    process.exit(0);
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    process.exit(1);
  }
}
