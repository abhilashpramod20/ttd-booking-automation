import { createBrowser } from "./utils/browser.js";
import { logger } from "./utils/logger.js";
import { requireApproval, selectFromList, enterText, printInfo, closePrompt } from "./utils/prompts.js";
import config from "../config/config.js";

async function interactiveGuide() {
  logger.section("TTD Interactive Booking Guide");

  const options = await selectFromList("What would you like to do?", [
    "Login to TTD account",
    "Book Srivani tickets (if already logged in)",
    "Complete full booking flow (login + booking)"
  ]);

  switch (options) {
    case "Login to TTD account":
      await runLogin();
      break;
    case "Book Srivani tickets (if already logged in)":
      await runBooking();
      break;
    case "Complete full booking flow (login + booking)":
      await runLogin();
      await runBooking();
      break;
  }
}

async function runLogin() {
  const browserManager = await createBrowser();
  const page = browserManager.getPage();

  try {
    logger.section("Interactive Login Guide");

    printInfo("Opening TTD website...");
    await browserManager.goto(`${config.baseUrl}/#/userLogin`);

    await page.waitForSelector('[ng-model="loginModel.username"]', { timeout: 10000 });

    printInfo("Login form is ready. Check your browser window.");
    await browserManager.screenshot("interactive-login-1.png");

    await requireApproval("Form Ready", "The login form is displayed. Ready to fill in credentials?");

    printInfo("Filling username...");
    await page.fill('[ng-model="loginModel.username"]', config.username);
    await browserManager.screenshot("interactive-login-2.png");

    printInfo("Filling password...");
    await page.fill('[ng-model="loginModel.password"]', config.password);
    await browserManager.screenshot("interactive-login-3.png");

    await requireApproval("Ready to Submit", "Username and password are filled in. Ready to click login?");

    printInfo("Submitting login...");
    const button = await page.$("button[type='submit']");
    if (button) {
      await button.click();
    } else {
      printInfo("Please click the login button manually and press 'yes'");
      await requireApproval("Click Login", "Please click the login button in the browser");
    }

    await page.waitForTimeout(3000);
    await browserManager.screenshot("interactive-login-4.png");

    printInfo("✓ Login completed. Check the browser to confirm you're logged in.");
  } catch (error) {
    logger.error(`Login failed: ${error.message}`);
    await browserManager.takeErrorScreenshot("interactive-login-error");
    throw error;
  }
}

async function runBooking() {
  const browserManager = await createBrowser();
  const page = browserManager.getPage();

  try {
    logger.section("Interactive Booking Guide");

    printInfo("Opening TTD website...");
    await browserManager.goto(`${config.baseUrl}/#/userLogin`);

    await page.waitForTimeout(2000);
    await browserManager.screenshot("interactive-booking-1.png");

    await requireApproval(
      "Ready to Book",
      "The website is open. Look for Srivani ticket options or booking section."
    );

    printInfo("Please manually navigate to the booking section and select dates...");
    await requireApproval("Select Dates", "Select your preferred dates in the browser, then click 'yes'");

    await browserManager.screenshot("interactive-booking-2.png");

    printInfo("Please review all booking details...");
    await requireApproval("Review Details", "Verify all information is correct, then click 'yes'");

    printInfo("Please submit the booking form...");
    await requireApproval("Submit Booking", "Click the confirm/submit button to complete booking");

    await page.waitForTimeout(3000);
    await browserManager.screenshot("interactive-booking-3.png");

    printInfo("✓ Booking completed. Check the browser for confirmation details.");
  } catch (error) {
    logger.error(`Booking failed: ${error.message}`);
    await browserManager.takeErrorScreenshot("interactive-booking-error");
    throw error;
  }
}

// Main execution
(async () => {
  try {
    await interactiveGuide();
  } catch (error) {
    logger.error(`Guide interrupted: ${error.message}`);
    process.exit(1);
  } finally {
    closePrompt();
  }
})();
