import { chromium } from "playwright";
import config from "../../config/config.js";
import { logger } from "./logger.js";

export class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    logger.info("Launching browser...");
    this.browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo || 0
    });

    this.page = await this.browser.newPage();

    // Set navigation timeout
    this.page.setDefaultNavigationTimeout(config.timeout);
    this.page.setDefaultTimeout(config.timeout);

    logger.success("Browser launched successfully");
    return this.page;
  }

  async goto(url) {
    logger.info(`Navigating to: ${url}`);
    const timeout = config.timeout || 30000;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.page.goto(url, { waitUntil: "domcontentloaded", timeout });
        logger.success(`Successfully navigated to ${url}`);
        return;
      } catch (error) {
        logger.warn(`Navigation attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        if (attempt === maxAttempts) {
          logger.error(`Failed to navigate to ${url}: ${error.message}`);
          throw error;
        }
        await this.page.waitForTimeout(1500);
      }
    }
  }

  async screenshot(filename) {
    if (config.screenshots) {
      const filepath = `screenshots/${filename}`;
      await this.page.screenshot({ path: filepath });
      logger.info(`Screenshot saved: ${filepath}`);
      return filepath;
    }
  }

  async takeErrorScreenshot(stepName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return this.screenshot(`error-${stepName}-${timestamp}.png`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info("Browser closed");
    }
  }

  getPage() {
    return this.page;
  }
}

export async function createBrowser() {
  const manager = new BrowserManager();
  await manager.launch();
  return manager;
}
