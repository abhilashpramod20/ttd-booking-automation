import { createBrowser } from "./utils/browser.js";
import { logger } from "./utils/logger.js";
import config from "../config/config.js";

async function runDonationFlow() {
  const browserManager = await createBrowser();
  const page = browserManager.getPage();

  try {
    logger.section("TTD Srivani Trust Donation - Automated Flow");

    // Step 1: Check if we're on the donation confirmation page
    logger.info("Checking current page...");
    const currentUrl = page.url();
    logger.info(`Current URL: ${currentUrl}`);

    // If not on donation page, navigate there
    if (!currentUrl.includes("SrivaniDonationConfirm")) {
      logger.warn("Not on donation page. Navigating to donation page...");
      await browserManager.goto(`${config.baseUrl}/#/SrivaniDonationConfirm`);
      await page.waitForTimeout(2000);
    }

    await browserManager.screenshot("01-donation-form-ready.png");

    // Step 2: Fill donation amount
    logger.info("Filling donation amount...");
    
    const donationAmountSelectors = [
      'input[ng-model*="donation"]',
      'input[name*="donation"]',
      'input[placeholder*="amount"]',
      'input[placeholder*="Donation"]',
      'input:nth-of-type(1)' // Fallback to first input
    ];

    let donationField = null;
    for (const selector of donationAmountSelectors) {
      const field = await page.$(selector).catch(() => null);
      if (field) {
        donationField = field;
        logger.info(`Found donation field: ${selector}`);
        break;
      }
    }

    if (!donationField) {
      logger.error("Donation amount field not found");
      throw new Error("Donation field not found");
    }

    // Clear and fill donation amount
    await donationField.fill("");
    await donationField.fill(config.donation.amount.toString());
    logger.success(`Donation amount filled: ₹${config.donation.amount}`);
    await browserManager.screenshot("02-donation-amount-filled.png");

    // Step 3: Check first checkbox (Corpus Donation)
    logger.info("Checking Corpus Donation checkbox...");
    
    // Use Playwright's locator for better reliability
    const corpusCheckboxLocators = [
      page.locator('text=/50%.*Corpus.*Donation/i').locator('..').locator('input'),
      page.locator('text=/Corpus Donation/i').locator('..').locator('input'),
      page.locator('input[type="checkbox"]').first(),
      page.locator('//input[@type="checkbox"]').first()
    ];

    let corpusCheckbox = null;
    for (const locator of corpusCheckboxLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        corpusCheckbox = locator;
        logger.info("Found Corpus Donation checkbox");
        break;
      }
    }

    if (corpusCheckbox && config.donation.corpusDonationCheckbox) {
      try {
        const isChecked = await corpusCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          await corpusCheckbox.click();
          logger.success("✓ Corpus Donation checkbox checked");
        } else {
          logger.info("Corpus Donation checkbox already checked");
        }
      } catch (e) {
        logger.warn(`Could not check Corpus checkbox: ${e.message}`);
      }
    }

    await browserManager.screenshot("03-checkbox1-checked.png");

    // Step 4: Check second checkbox (Indian Citizenship)
    logger.info("Checking Indian Citizenship checkbox...");
    
    const citizenshipCheckboxLocators = [
      page.locator('text=/Indian citizenship/i').locator('..').locator('input'),
      page.locator('text=/Foreign nationals not accepted/i').locator('..').locator('input'),
      page.locator('input[type="checkbox"]').nth(1),
      page.locator('//input[@type="checkbox"]').nth(1)
    ];

    let citizenCheckbox = null;
    for (const locator of citizenshipCheckboxLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        citizenCheckbox = locator;
        logger.info("Found Indian Citizenship checkbox");
        break;
      }
    }

    if (citizenCheckbox && config.donation.indianCitizenshipCheckbox) {
      try {
        const isChecked = await citizenCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          await citizenCheckbox.click();
          logger.success("✓ Indian Citizenship checkbox checked");
        } else {
          logger.info("Indian Citizenship checkbox already checked");
        }
      } catch (e) {
        logger.warn(`Could not check Citizenship checkbox: ${e.message}`);
      }
    }

    await browserManager.screenshot("04-checkbox2-checked.png");

    // Step 5: Click Continue button with better selectors
    logger.info("Looking for Continue button...");
    
    const continueButtonLocators = [
      page.locator('button:has-text("Continue")'),
      page.locator('button:has-text("continue")'),
      page.locator('text="Continue"'),
      page.locator('//button[contains(text(), "Continue")]'),
      page.locator('button.btn-act'),
      page.locator('button[ng-click*="continue"]')
    ];

    let continueButton = null;
    for (const locator of continueButtonLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        continueButton = locator;
        logger.info("Found Continue button");
        break;
      }
    }

    if (!continueButton) {
      logger.error("Continue button not found");
      throw new Error("Continue button not found");
    }

    await browserManager.screenshot("05-before-continue-click.png");
    
    // Scroll button into view and click
    try {
      await continueButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await continueButton.click();
      logger.success("✓ Continue button clicked");
    } catch (error) {
      logger.warn(`Click failed: ${error.message}, trying force click`);
      try {
        await continueButton.click({ force: true });
        logger.success("✓ Continue button clicked (forced)");
      } catch (e2) {
        logger.warn(`Force click also failed, trying JS click`);
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes('Continue')) {
              btn.click();
              break;
            }
          }
        });
        logger.success("✓ Continue button clicked (via JavaScript)");
      }
    }
    
    // Wait for next page to load (might be a modal)
    await page.waitForTimeout(2000);
    await browserManager.screenshot("06-after-continue-click.png");

    // Step 6: Check for "Current Booking" button and click it
    logger.info("Looking for 'Current Booking' button...");
    
    // Wait for modal to appear if it does
    try {
      await page.waitForSelector('button:has-text("Current Booking"), text=Current Booking', { timeout: 3000 }).catch(() => null);
    } catch (e) {
      logger.info("No modal appeared or timeout waiting for modal");
    }

    const currentBookingLocators = [
      page.locator('button:has-text("Current Booking")'),
      page.locator('text="Current Booking"').first(),
      page.locator('//button[contains(text(), "Current Booking")]').first(),
      page.locator('button').filter({ hasText: 'Current Booking' }),
      page.locator('a:has-text("Current Booking")')
    ];

    let currentBookingButton = null;
    for (const locator of currentBookingLocators) {
      try {
        const count = await locator.count().catch(() => 0);
        if (count > 0) {
          currentBookingButton = locator;
          logger.info("Found Current Booking button");
          break;
        }
      } catch (e) {
        // Continue to next locator
      }
    }

    if (currentBookingButton) {
      await browserManager.screenshot("07-before-booking-click.png");
      try {
        await currentBookingButton.first().click({ timeout: 5000 });
        logger.success("✓ Current Booking button clicked");
      } catch (e) {
        logger.warn(`Click failed: ${e.message}, trying force click`);
        try {
          await currentBookingButton.first().click({ force: true });
          logger.success("✓ Current Booking button clicked (forced)");
        } catch (e2) {
          logger.warn(`Force click failed, trying JavaScript`);
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('Current Booking')) {
                btn.click();
                break;
              }
            }
          });
          logger.success("✓ Current Booking button clicked (via JavaScript)");
        }
      }
      
      // Wait for booking page to load
      await page.waitForTimeout(2000);
      await browserManager.screenshot("08-after-booking-click.png");
    } else {
      logger.warn("Current Booking button not found on this page");
      logger.info("Modal may not have appeared or button has different selector");
      await browserManager.screenshot("08-no-booking-button.png");
    }

    logger.success("✓ Donation flow completed successfully!");
    logger.info("\nNext steps:");
    logger.info("1. A new page should have opened for ticket booking");
    logger.info("2. Manual CAPTCHA entry will be required");
    logger.info("3. Select your preferred ticket and complete booking");

    return true;

  } catch (error) {
    logger.error(`Donation flow failed: ${error.message}`);
    await browserManager.takeErrorScreenshot("donation-error");
    throw error;
  } finally {
    logger.info("Donation flow completed. Browser remains open for next steps.");
    logger.info("You can now manually select tickets or close the browser.");
  }
}

// Main execution
(async () => {
  try {
    logger.section("TTD Srivani Trust Donation - Automation Script");
    logger.info("Automating Srivani trust donation with all declarations.");
    logger.info(`Donation Amount: ₹${config.donation.amount}`);

    const result = await runDonationFlow();

    if (result) {
      logger.success("✓ Donation automation completed successfully!");
      logger.info("\nConfiguration used:");
      logger.info(`- Donation Amount: ₹${config.donation.amount}`);
      logger.info(`- Corpus Donation: ${config.donation.corpusDonationCheckbox ? "Yes" : "No"}`);
      logger.info(`- Indian Citizenship: ${config.donation.indianCitizenshipCheckbox ? "Yes" : "No"}`);
    }
  } catch (error) {
    logger.error(`Script execution failed: ${error.message}`);
    process.exit(1);
  }
})();
