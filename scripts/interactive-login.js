#!/usr/bin/env node
import { chromium } from "playwright";
import config from "../config/config.js";
import { logger } from "./utils/logger.js";
import { extractCaptcha } from "./utils/ocr.js";

logger.section("TTD AUTOMATION - FULLY AUTOMATED LOGIN");

async function runAutomation() {
  const browser = await chromium.launch({
    headless: config.headless
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    logger.section("PHASE 1: NAVIGATING TO LOGIN PAGE");
    logger.info("Opening login page...");
    await page.goto(config.baseUrl + "/#/userLogin", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshots/01-login-page.png" });

    logger.section("PHASE 2: AUTO-FILLING LOGIN FORM");
    logger.info(`Using credentials from config.js`);
    logger.info(`Username: ${config.username}`);
    
    // Fill username - use clear + type instead of fill for better AngularJS compatibility
    const uField = page.locator('input[name="uName"]');
    if (!await uField.isVisible({ timeout: 5000 })) {
      throw new Error("Username field not found");
    }
    
    // Clear field first
    await uField.click();
    await uField.press('Control+A');
    await uField.press('Delete');
    await page.waitForTimeout(300);
    
    // Type username character by character with delay
    for (const char of config.username) {
      await uField.type(char, { delay: 30 });
    }
    await page.waitForTimeout(800);
    logger.success(`✓ Username filled: ${config.username}`);
    await page.screenshot({ path: "screenshots/02-username-filled.png" });

    // Fill password
    const pField = page.locator('input[name="pwd"]');
    if (!await pField.isVisible({ timeout: 5000 })) {
      throw new Error("Password field not found");
    }
    
    await pField.click();
    await pField.press('Control+A');
    await pField.press('Delete');
    await page.waitForTimeout(300);
    
    // Type password character by character with delay
    for (const char of config.password) {
      await pField.type(char, { delay: 30 });
    }
    await page.waitForTimeout(800);
    logger.success("✓ Password filled (not shown for security)");
    await page.screenshot({ path: "screenshots/03-password-filled.png" });

    logger.section("PHASE 3: CAPTCHA RECOGNITION");
    
    // Wait for CAPTCHA to load
    await page.waitForTimeout(2000);
    const captchaField = page.locator('input[placeholder="Enter Captcha Code"]');
    
    if (!await captchaField.isVisible({ timeout: 5000 })) {
      throw new Error("CAPTCHA field not found");
    }

    logger.info("CAPTCHA detected - running OCR...");
    
    let captchaCode = null;
    let attempts = 0;
    
    while (!captchaCode && attempts < 3) {
      attempts++;
      try {
        captchaCode = await extractCaptcha(page);
        if (captchaCode && captchaCode.length >= 4) {
          logger.success(`✓ CAPTCHA recognized (attempt ${attempts}): ${captchaCode}`);
          break;
        }
      } catch (e) {
        logger.warn(`OCR attempt ${attempts} failed: ${e.message}`);
      }
    }

    if (!captchaCode) {
      throw new Error("Could not extract CAPTCHA after 3 attempts");
    }

    // Clear captcha field first
    await captchaField.click();
    await captchaField.press('Control+A');
    await captchaField.press('Delete');
    await page.waitForTimeout(300);
    
    // Type CAPTCHA character by character
    for (const char of captchaCode) {
      await captchaField.type(char, { delay: 40 });
    }
    await page.waitForTimeout(800);
    logger.success("✓ CAPTCHA filled");
    await page.screenshot({ path: "screenshots/04-captcha-filled.png" });

    logger.section("PHASE 4: SUBMITTING LOGIN");
    
    // Click login button
    const loginBtn = page.locator('button:has-text("Login"), button:has-text("login"), button[type="submit"]').first();
    if (!await loginBtn.isVisible({ timeout: 5000 })) {
      throw new Error("Login button not found");
    }

    logger.info("Clicking login button...");
    await loginBtn.click();
    logger.success("✓ Login button clicked");
    await page.waitForTimeout(1000);

    logger.section("PHASE 5: WAITING FOR LOGIN RESPONSE");
    
    let loginSuccess = false;
    let checkCount = 0;
    const maxChecks = 60; // 60 seconds

    for (let i = 0; i < maxChecks; i++) {
      await page.waitForTimeout(1000);
      checkCount++;

      const url = page.url();
      const urlFragment = url.substring(url.lastIndexOf('#'));
      
      if (checkCount % 10 === 1) {
        logger.info(`Checking login status... (${checkCount}s elapsed) - Current page: ${urlFragment}`);
      }

      // Check if we've navigated away from login
      if (!url.includes("/#/userLogin")) {
        logger.success("✓ Navigation detected!");
        loginSuccess = true;
        break;
      }

      // Check for error messages
      const errors = await page.locator('[class*="error"], .alert-danger, [ng-show*="error"]').all();
      if (errors.length > 0 && checkCount > 3) {
        try {
          const errorText = await errors[0].textContent();
          if (errorText && errorText.trim()) {
            logger.warn(`Form error: ${errorText.trim()}`);
          }
        } catch (e) {
          // Ignore error text extraction failures
        }
      }
    }

    await page.screenshot({ path: "screenshots/05-after-login-submit.png" });

    if (!loginSuccess) {
      logger.error("❌ Login timeout - still on login page after 60 seconds");
      logger.warn("This could indicate:");
      logger.warn("  1. Invalid credentials");
      logger.warn("  2. Incorrect CAPTCHA");
      logger.warn("  3. Server-side issues");
      logger.warn("  4. Account not activated");
      
      logger.info("Proceeding anyway with direct navigation fallback...");
    } else {
      logger.success("✓ LOGIN SUCCESSFUL!");
    }

    logger.section("PHASE 6: NAVIGATING TO BOOKING");
    logger.info("Navigating to donation page...");
    await page.goto(config.baseUrl + "/#/SrivaniDonationConfirm", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/06-donation-page.png" });

    logger.success("✓ Reached donation/booking page!");

    logger.section("PHASE 7: DONATION FORM HANDLING");
    
    logger.info("Waiting for donation form to fully load...");
    await page.waitForTimeout(1000);
    
    logger.info("Looking for Indian Citizenship Declaration checkbox...");
    
    // Use JavaScript to directly interact with the checkbox since Playwright has visibility issues
    const checkboxResult = await page.evaluate(() => {
      // Find checkbox by name
      const checkbox = document.querySelector('input[name="indian"]') || 
                       document.querySelector('input[type="checkbox"]') ||
                       document.querySelector('input[ng-model*="citizen"]');
      
      if (!checkbox) {
        return { success: false, message: "Checkbox not found" };
      }
      
      // Check the checkbox
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('click', { bubbles: true }));
      
      // Trigger AngularJS if available
      if (window.angular) {
        try {
          angular.element(checkbox).scope().$apply();
        } catch (e) {
          // Ignore AngularJS errors
        }
      }
      
      return { 
        success: true, 
        message: "Checkbox checked",
        name: checkbox.name,
        checked: checkbox.checked
      };
    });
    
    if (checkboxResult.success) {
      logger.success(`✓ Indian Citizenship checkbox checked (name: ${checkboxResult.name})`);
    } else {
      logger.warn(`⚠️ ${checkboxResult.message}`);
    }
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: "screenshots/07-donation-form-ready.png" });

    // Look for Continue button
    logger.info("Looking for Continue button...");
    const continueBtn = page.locator('button:has-text("Continue")').first();
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      logger.info("Found Continue button, clicking...");
      await continueBtn.click();
      await page.waitForTimeout(3000);
      logger.success("✓ Continue button clicked");
      await page.screenshot({ path: "screenshots/08-after-continue.png" });
    } else {
      logger.warn("⚠️ Continue button not found - using JavaScript click");
      
      // Try JavaScript click
      const clicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.toLowerCase().includes('continue')
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (clicked) {
        await page.waitForTimeout(3000);
        logger.success("✓ Continue button clicked via JavaScript");
        await page.screenshot({ path: "screenshots/08-after-continue.png" });
      } else {
        logger.error("Could not find Continue button");
      }
    }

    logger.section("✓ AUTOMATION COMPLETE!");
    logger.success("Browser is now open for manual booking completion");
    logger.warn("\nNext steps:");
    logger.warn("  1. Select your preferred Darshan date");
    logger.warn("  2. Enter pilgrim details if required");
    logger.warn("  3. Complete payment");
    logger.warn("\nPress Ctrl+C to close the browser when done");
    
    // Keep browser open indefinitely
    await new Promise(() => {
      // Never resolves - browser stays open until user closes it
    });

  } catch (error) {
    logger.error(`❌ Automation failed: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    try {
      await page.screenshot({ path: "screenshots/error-final.png" });
      logger.info("Error screenshot saved");
    } catch (e) {
      // Ignore
    }
    
    await browser.close();
    process.exit(1);
  }
}

// Run with graceful shutdown
process.on('SIGINT', async () => {
  logger.info("\nClosing browser...");
  process.exit(0);
});

await runAutomation();
