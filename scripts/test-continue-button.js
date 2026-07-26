/**
 * Test script to directly test Continue button automation
 * Bypasses login and goes straight to donation page
 */

import { createBrowser } from "./utils/browser.js";
import { logger } from "./utils/logger.js";
import { enterText } from "./utils/prompts.js";
import config from "../config/config.js";

async function testContinueButton() {
  let browserManager = null;

  try {
    logger.section("TESTING CONTINUE BUTTON AUTOMATION");
    logger.info("This script tests the Continue button click without going through login");
    
    browserManager = await createBrowser();
    const page = browserManager.page;

    // Navigate directly to donation page (bypassing login)
    logger.info("Navigating directly to donation page (bypassing login)...");
    await browserManager.goto(`${config.baseUrl}/#/SrivaniDonationConfirm`);
    await page.waitForTimeout(3000);
    
    const initialUrl = page.url();
    logger.info(`Initial URL: ${initialUrl}`);
    
    if (!initialUrl.includes("SrivaniDonationConfirm")) {
      logger.warn("Not on donation page - may require login");
      logger.info("Attempting to log in via browser session...");
      await browserManager.goto(`${config.baseUrl}/#/userLogin`);
      
      const loginNeeded = await enterText(
        "Browser opened to login page. Please log in manually, then press ENTER",
        "Press ENTER after logging in"
      );
      
      await browserManager.goto(`${config.baseUrl}/#/SrivaniDonationConfirm`);
      await page.waitForTimeout(3000);
    }

    await browserManager.screenshot("test-00-donation-page.png");
    logger.success("✓ On donation page");

    // Check for checkbox
    logger.info("Looking for Indian Citizenship checkbox...");
    const checkboxLocators = [
      page.locator('text=/I\\/We here by declare that, I\\/We have Indian citizenship/i').locator('..').locator('input'),
      page.locator('text=/I\\/We have Indian citizenship/i').locator('..').locator('input'),
      page.locator('input[type="checkbox"]').first(),
    ];

    let checkbox = null;
    for (const locator of checkboxLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        checkbox = locator;
        logger.info("Found checkbox");
        break;
      }
    }

    if (checkbox) {
      const isChecked = await checkbox.isChecked().catch(() => false);
      if (!isChecked) {
        await checkbox.click();
        logger.success("✓ Checkbox checked");
      } else {
        logger.info("Checkbox already checked");
      }
    }

    await browserManager.screenshot("test-01-checkbox-checked.png");

    // Find Continue button
    logger.info("Looking for Continue button...");
    const continueButtonLocators = [
      page.locator('button:has-text("Continue")'),
      page.locator('button:has-text("continue")'),
      page.locator('text="Continue"'),
      page.locator('//button[contains(text(), "Continue")]'),
    ];

    let continueButton = null;
    for (const locator of continueButtonLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        continueButton = locator;
        logger.success("✓ Found Continue button");
        break;
      }
    }

    if (!continueButton) {
      logger.error("Continue button not found!");
      await browserManager.screenshot("test-02-no-continue-button.png");
      return;
    }

    await browserManager.screenshot("test-02-before-continue-click.png");

    // Test Continue button click with 4 strategies
    logger.section("TESTING CONTINUE BUTTON CLICK");
    
    const urlBefore = page.url();
    logger.info(`URL before Continue click: ${urlBefore}`);

    let continueClicked = false;

    // Strategy 1: Standard click
    try {
      logger.info("Strategy 1: Standard Playwright click...");
      await continueButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await continueButton.click();
      logger.success("✓ Strategy 1 succeeded");
      continueClicked = true;
    } catch (e1) {
      logger.warn(`Strategy 1 failed: ${e1.message}`);

      // Strategy 2: JavaScript click
      try {
        logger.info("Strategy 2: JavaScript click...");
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes('Continue')) {
              btn.click();
              break;
            }
          }
        });
        logger.success("✓ Strategy 2 succeeded");
        continueClicked = true;
      } catch (e2) {
        logger.warn(`Strategy 2 failed: ${e2.message}`);

        // Strategy 3: Force click
        try {
          logger.info("Strategy 3: Force click...");
          await continueButton.click({ force: true });
          logger.success("✓ Strategy 3 succeeded");
          continueClicked = true;
        } catch (e3) {
          logger.warn(`Strategy 3 failed: ${e3.message}`);
          
          // Strategy 4: Angular form submit
          try {
            logger.info("Strategy 4: Angular form submit...");
            const result = await page.evaluate(() => {
              const button = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Continue')
              );
              if (button) {
                button.click();
                return true;
              }
              return false;
            });
            if (result) {
              logger.success("✓ Strategy 4 succeeded");
              continueClicked = true;
            }
          } catch (e4) {
            logger.warn(`Strategy 4 failed: ${e4.message}`);
          }
        }
      }
    }

    if (!continueClicked) {
      logger.error("❌ All strategies failed!");
      await browserManager.screenshot("test-03-continue-click-failed.png");
      return;
    }

    // Monitor for page changes
    logger.info("Monitoring for page changes...");
    logger.info("Waiting 5 seconds for URL change...");

    await page.waitForTimeout(5000);

    const urlAfter = page.url();
    logger.info(`URL after Continue click: ${urlAfter}`);

    if (urlAfter !== urlBefore) {
      logger.success(`✅ PAGE NAVIGATED! URL changed to: ${urlAfter}`);
      await browserManager.screenshot("test-04-after-continue-click-success.png");
    } else {
      logger.warn("⚠️  URL did not change - checking for modals or content updates...");
      
      // Check for Current Booking button
      const bookingButtonLocators = [
        page.locator('button:has-text("Current Booking")'),
        page.locator('text="Current Booking"'),
      ];

      let bookingButton = null;
      for (const locator of bookingButtonLocators) {
        const count = await locator.count().catch(() => 0);
        if (count > 0) {
          bookingButton = locator;
          logger.success("✓ Found Current Booking button!");
          
          // Try to click it
          try {
            await bookingButton.click();
            logger.success("✓ Current Booking button clicked!");
            await page.waitForTimeout(2000);
            const finalUrl = page.url();
            logger.success(`✓ Now on page: ${finalUrl}`);
          } catch (e) {
            logger.warn(`Could not click Current Booking button: ${e.message}`);
          }
          break;
        }
      }

      if (!bookingButton) {
        logger.warn("❌ Current Booking button NOT found");
        logger.info("This means the Continue click likely did not submit the form");
      }
      
      await browserManager.screenshot("test-05-after-continue-no-url-change.png");
    }

    logger.section("TEST COMPLETE");
    logger.success("Continue button test completed!");
    
    logger.info("\nTest Results Summary:");
    logger.info(`✓ Continue button was clickable: ${continueClicked}`);
    logger.info(`✓ URL changed: ${urlAfter !== urlBefore}`);
    logger.info(`Original URL: ${urlBefore}`);
    logger.info(`Final URL: ${urlAfter}`);

    logger.info("\nBrowser will remain open. Press ENTER to close.");
    await enterText("Test complete. Press ENTER to close browser", "Press ENTER");

  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    logger.error(error.stack);
  } finally {
    if (browserManager) {
      await browserManager.close();
    }
  }
}

testContinueButton().catch(console.error);
