import { createBrowser } from "./utils/browser.js";
import { logger } from "./utils/logger.js";
import { requireApproval, selectFromList, printError, closePrompt } from "./utils/prompts.js";
import config from "../config/config.js";

async function runBookingFlow() {
  const browserManager = await createBrowser();
  const page = browserManager.getPage();

  try {
    logger.section("TTD Srivani Ticket Booking - Start");

    // Navigate to website
    await browserManager.goto(`${config.baseUrl}/#/userLogin`);

    logger.info("Waiting for page to fully load...");
    await page.waitForTimeout(2000);

    // Check if already logged in or need to log in
    const isLoggedIn = await page.$(".user-menu, [ng-controller*='Dashboard']").catch(() => null);

    if (!isLoggedIn) {
      logger.info("Not logged in. Please log in first using 'npm run login' script.");
      throw new Error("Login required");
    }

    await browserManager.screenshot("01-dashboard-loaded.png");

    // Step 2: Navigate to ticket booking
    await requireApproval(
      "Navigate to Ticket Booking",
      "We'll now navigate to the ticket booking section. Look for Srivani ticket options."
    );

    logger.info("Looking for booking section...");

    // Try to find and click on Srivani or ticket booking link
    // The exact selector depends on the website structure
    const bookingOptions = [
      'a:has-text("Srivani")',
      'a:has-text("Book Tickets")',
      'a:has-text("Seva")',
      'a:has-text("Special Entry")',
      '[href*="srivani"]',
      '[href*="booking"]',
      '[href*="tickets"]'
    ];

    let found = false;
    for (const selector of bookingOptions) {
      const element = await page.$(selector).catch(() => null);
      if (element) {
        logger.info(`Found booking option: ${selector}`);
        await element.click();
        found = true;
        break;
      }
    }

    if (!found) {
      logger.warn("Could not find booking options. Please manually navigate to ticket booking in the browser.");
      await requireApproval("Manual Navigation", "Navigate to Srivani ticket booking section manually, then click 'yes'.");
    }

    await page.waitForTimeout(2000);
    await browserManager.screenshot("02-booking-section-loaded.png");

    // Step 3: Show available options
    await requireApproval(
      "Review Ticket Options",
      "The ticket options should now be visible. Please review the available Srivani ticket dates and options."
    );

    // Step 4: Get selection details
    logger.info("Collecting booking preferences...");
    const dates = await page.locator("td, button, a").allTextContents();
    logger.info(`Found ${dates.length} date/option elements`);

    // Step 5: Select tickets
    await requireApproval(
      "Select Tickets",
      "Please click on your preferred date/ticket option in the browser window. We'll wait for you to make a selection."
    );

    logger.info("Waiting for ticket selection...");
    await page.waitForTimeout(3000);
    await browserManager.screenshot("03-ticket-selected.png");

    // Step 6: Proceed to booking form
    const continueButton = await page
      .$('button:has-text("Continue"), button:has-text("Proceed"), button:has-text("Next")')
      .catch(() => null);

    if (continueButton) {
      await requireApproval(
        "Proceed to Booking Details",
        "Click 'Continue' or 'Next' button to proceed with your booking."
      );

      await continueButton.click();
      await page.waitForTimeout(2000);
      await browserManager.screenshot("04-booking-form-loaded.png");
    }

    // Step 7: Review booking details
    await requireApproval(
      "Review Booking Details",
      "Please review all the booking details (dates, number of tickets, pilgrim information) in the form."
    );

    // Step 8: Confirm booking
    const confirmButton = await page
      .$('button:has-text("Confirm"), button:has-text("Book"), button:has-text("Submit")')
      .catch(() => null);

    if (confirmButton) {
      await requireApproval(
        "Final Confirmation",
        "All details are ready. Click 'yes' to submit the booking. This is the final step!"
      );

      await confirmButton.click();
      logger.info("Booking submitted! Waiting for confirmation...");
      await page.waitForTimeout(3000);
      await browserManager.screenshot("05-booking-submitted.png");

      // Look for success message
      const successMsg = await page.$(".success-message, [ng-show*='success'], .alert-success").catch(() => null);

      if (successMsg) {
        logger.success("✓ Booking completed successfully!");
        const message = await successMsg.textContent();
        logger.success(`Confirmation: ${message}`);
      } else {
        logger.info("Please verify booking status in the browser window.");
      }
    } else {
      logger.warn("Could not find confirm button. Please manually complete the booking.");
      await requireApproval("Manual Confirmation", "Complete the booking manually by clicking submit/confirm button.");
    }

    return true;
  } catch (error) {
    logger.error(`Booking flow failed: ${error.message}`);
    await browserManager.takeErrorScreenshot("booking-error");
    printError(error.message);
    throw error;
  } finally {
    logger.info("Booking flow completed. Browser remains open for verification.");
  }
}

// Main execution
(async () => {
  try {
    logger.section("TTD Guided Booking - Srivani Tickets");
    logger.info("This script will guide you through booking Srivani tickets with manual approval at each step.");
    logger.info("Make sure you're already logged in. Use 'npm run login' first if needed.");

    const result = await runBookingFlow();

    if (result) {
      logger.success("✓ Booking process completed!");
      logger.info("\nPlease verify in the browser that your booking was successful.");
      logger.info("You should receive a confirmation with booking details.");
    }
  } catch (error) {
    logger.error(`Script execution failed: ${error.message}`);
    process.exit(1);
  } finally {
    closePrompt();
  }
})();
