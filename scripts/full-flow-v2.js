import { chromium } from "playwright";
import config from "../config/config.js";
import { logger } from "./utils/logger.js";
import { extractCaptcha } from "./utils/ocr.js";
import { BrowserManager } from "./utils/browser.js";

logger.section("TTD COMPLETE AUTOMATION FLOW (Playwright Edition)");
logger.info("Full automation: Login → Donation → Booking confirmation");
logger.info("Browser remains ACTIVE for manual booking completion");

/**
 * Main automation flow
 */
async function runAutomation() {
  const browserManager = new BrowserManager();

  try {
    // Launch browser
    logger.section("PHASE 1: LAUNCHING BROWSER");
    logger.info("Launching browser...");
    
    const browserObj = await chromium.launch({
      headless: config.headless
    });

    const page = await browserObj.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    logger.success("✓ Browser launched successfully");

    // ═══════════════════════════════════════════════════════════════════
    // LOGIN PHASE
    // ═══════════════════════════════════════════════════════════════════
    logger.section("PHASE 2: LOGIN WITH AUTOMATIC CAPTCHA OCR");

    logger.info("Navigating to login page...");
    await page.goto(config.baseUrl + "/#/userLogin", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for page to fully load

    await page.screenshot({ path: "screenshots/01-login-page-loaded.png" });

    // Fill username - using Playwright locator with type for AngularJS compatibility
    logger.info("Filling username field...");
    const usernameLocator = page.locator('input[name="uName"]');
    await usernameLocator.fill("");
    await page.waitForTimeout(300);
    // Use type with delay for better AngularJS event handling
    await usernameLocator.type(config.username, { delay: 30 });
    await page.waitForTimeout(500);
    logger.success(`✓ Username filled: ${config.username}`);
    await page.screenshot({ path: "screenshots/02-username-filled.png" });

    // Fill password
    logger.info("Filling password field...");
    const passwordLocator = page.locator('input[name="pwd"]');
    await passwordLocator.fill("");
    await page.waitForTimeout(300);
    for (const char of config.password) {
      await passwordLocator.type(char, { delay: 30 });
    }
    await page.waitForTimeout(500);
    logger.success("✓ Password filled (not shown for security)");
    await page.screenshot({ path: "screenshots/03-password-filled.png" });

    // Wait for CAPTCHA and handle it
    logger.info("Waiting for CAPTCHA...");
    await page.waitForTimeout(3000);

    // CAPTCHA input doesn't have name attribute, find by placeholder
    const captchaLocator = page.locator('input[placeholder="Enter Captcha Code"]');
    const captchaExists = await captchaLocator.isVisible().catch(() => false);

    if (captchaExists) {
      logger.info("CAPTCHA detected, running OCR...");
      
      const captchaImage = page.locator('img[ng-show*="captcha"], img.captcha-image, img[alt*="captcha"]');
      if (await captchaImage.isVisible().catch(() => false)) {
        await page.screenshot({ path: "screenshots/04-captcha-visible.png" });
      }

      // Try OCR
      let captchaCode = null;
      try {
        captchaCode = await extractCaptcha(page);
      } catch (e) {
        logger.warn(`OCR failed: ${e.message}, will prompt user`);
      }

      if (captchaCode && captchaCode.length >= 4) {
        logger.success(`✓ CAPTCHA recognized via OCR: ${captchaCode}`);
        
        // Fill CAPTCHA
        await captchaLocator.fill("");
        await page.waitForTimeout(300);
        await captchaLocator.type(captchaCode, { delay: 50 });
        await page.waitForTimeout(300);
        
        logger.success("✓ CAPTCHA filled automatically");
        await page.screenshot({ path: "screenshots/05-captcha-filled.png" });
      } else {
        logger.warn("⚠️ OCR failed, CAPTCHA will need manual entry");
        await page.screenshot({ path: "screenshots/05-captcha-ocr-failed.png" });
      }
    } else {
      logger.warn("⚠️ CAPTCHA field not found on page");
      await page.screenshot({ path: "screenshots/04-no-captcha.png" });
    }

    // Click login button
    logger.info("Clicking login button...");
    const loginButton = page.locator('button:has-text("Login"), button:has-text("login"), button[type="submit"]').first();

    if (await loginButton.isVisible()) {
      await loginButton.click();
      logger.success("✓ Login button clicked");
    } else {
      throw new Error("Login button not found");
    }

    // Wait for login to complete
    logger.info("Waiting for authentication...");
    let loggedIn = false;
    let waitAttempts = 0;

    while (waitAttempts < 30 && !loggedIn) {
      try {
        await page.waitForTimeout(1000);
      } catch (e) {
        logger.error(`Page closed during wait: ${e.message}`);
        break;
      }
      
      waitAttempts++;

      try {
        const currentUrl = page.url();
        logger.debug(`Wait attempt ${waitAttempts}: URL = ${currentUrl}`);

        if (!currentUrl.includes("/#/userLogin")) {
          logger.success("✓ Navigation detected, login appears successful");
          loggedIn = true;
        }

        // Check for form errors
        const errorElements = await page.locator('[class*="error"], .alert-danger').all();
        if (errorElements.length > 0) {
          const errorText = await errorElements[0].textContent();
          if (errorText && waitAttempts === 2) {
            logger.warn(`Form error detected: ${errorText.trim()}`);
          }
        }
      } catch (e) {
        logger.debug(`Error checking URL on attempt ${waitAttempts}: ${e.message}`);
        break;
      }
    }

    try {
      await page.screenshot({ path: "screenshots/06-after-login-attempt.png" });
    } catch (e) {
      logger.warn("Could not take screenshot after login");
    }

    // Verify login
    const finalUrl = page.url();
    if (finalUrl.includes("/#/userLogin")) {
      logger.warn("⚠️ Still on login page, trying fallback navigation...");
      logger.info("Navigating directly to donation page...");
      await page.goto(config.baseUrl + "/#/SrivaniDonationConfirm", { waitUntil: "domcontentloaded" });
    }

    logger.success("✓ LOGIN PHASE COMPLETED");

    // ═══════════════════════════════════════════════════════════════════
    // DONATION PHASE
    // ═══════════════════════════════════════════════════════════════════
    logger.section("PHASE 3: SRIVANI TRUST DONATION");

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/07-donation-page-ready.png" });

    // Look for donation form elements
    logger.info("Looking for donation form...");
    
    // Try to find and check citizenship checkbox
    const citizenshipCheckbox = page.locator('input[type="checkbox"][ng-model*="citizen"]').first();
    if (await citizenshipCheckbox.isVisible().catch(() => false)) {
      logger.info("Found citizenship checkbox");
      await citizenshipCheckbox.check();
      logger.success("✓ Citizenship checkbox checked");
    }

    // Look for Continue button
    logger.info("Looking for Continue button...");
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("CONTINUE"), button:has-text("continue")').first();

    if (await continueButton.isVisible().catch(() => false)) {
      await page.screenshot({ path: "screenshots/08-before-continue.png" });
      
      logger.info("Clicking Continue button...");
      await continueButton.click();
      logger.success("✓ Continue button clicked");

      await page.waitForTimeout(3000);
      await page.screenshot({ path: "screenshots/09-after-continue.png" });
    } else {
      logger.warn("⚠️ Continue button not found, page may have different layout");
    }

    logger.success("✓ DONATION PHASE COMPLETED");

    // ═══════════════════════════════════════════════════════════════════
    // BOOKING PHASE
    // ═══════════════════════════════════════════════════════════════════
    logger.section("PHASE 4: BOOKING PAGE REACHED");

    const currentBookingUrl = page.url();
    logger.info(`Current URL: ${currentBookingUrl}`);
    await page.screenshot({ path: "screenshots/10-booking-page.png" });

    logger.success("✓ AUTOMATION COMPLETED");
    logger.warn("⚠️ Browser is now ACTIVE - Please manually:");
    logger.warn("  1. Select your desired Darshan date");
    logger.warn("  2. Complete the payment");
    logger.warn("  3. Press ENTER in terminal when done to close");

    // Wait for user to complete booking
    await new Promise(resolve => {
      process.stdin.once("data", resolve);
    });

    logger.info("Closing browser...");
    await browserObj.close();
    logger.success("✓ Automation finished successfully!");

  } catch (error) {
    logger.error(`❌ Automation failed: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run automation
await runAutomation();
