import Tesseract from "tesseract.js";
import { logger } from "./logger.js";
import fs from "fs";
import path from "path";

/**
 * Extract text from CAPTCHA image using OCR
 * @param {Page} page - Playwright page object
 * @param {string} captchaImagePath - Path to CAPTCHA screenshot
 * @returns {Promise<string>} - Extracted CAPTCHA code
 */
export async function recognizeCaptcha(page, captchaImagePath) {
  try {
    logger.info("Starting OCR CAPTCHA recognition...");

    let imagePath = captchaImagePath;

    // If no valid screenshot path provided, extract and save CAPTCHA image directly
    if (!imagePath || !fs.existsSync(imagePath)) {
      logger.info("Extracting CAPTCHA image element...");

      // Find CAPTCHA image by looking for base64 encoded image (data:image/png)
      const captchaImages = await page.$$eval('img', elements =>
        elements.map(el => ({
          src: el.getAttribute('src'),
          boundingBox: el.getBoundingClientRect()
        }))
      );

      logger.debug(`Found ${captchaImages.length} images on page`);

      // Find the base64 encoded image (CAPTCHA is usually a data: URL)
      let captchaImgData = captchaImages.find(img => img.src?.startsWith('data:image'));

      if (!captchaImgData) {
        logger.warn("Could not find CAPTCHA image element with base64 data");
        return null;
      }

      // Save base64 image to file
      const base64Data = captchaImgData.src.replace(/^data:image\/png;base64,/, '');
      imagePath = `screenshots/captcha-${Date.now()}.png`;
      
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(imagePath, buffer);
        logger.info(`CAPTCHA image extracted and saved: ${imagePath}`);
      } catch (e) {
        logger.error(`Failed to save CAPTCHA image: ${e.message}`);
        return null;
      }
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      logger.warn("No CAPTCHA image available for OCR");
      return null;
    }

    logger.info(`Running OCR on: ${imagePath}`);

    // Run Tesseract OCR
    const {
      data: { text },
    } = await Tesseract.recognize(imagePath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    logger.debug(`Raw OCR output: "${text}"`);

    // Clean up the text
    // Remove whitespace, special characters, keep only alphanumeric
    let cleaned = text
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .substring(0, 8); // CAPTCHA can be 6-8 characters

    // Common OCR misrecognitions for CAPTCHA digits/letters
    // These are heuristic fixes based on common Tesseract errors
    // 6 often misread as B (similar shapes)
    // 5 often misread as S
    // 0 often misread as O
    // 1 often misread as I or L
    // 8 often misread as B
    
    // For now, just log what we got
    logger.debug(`Cleaned OCR output: "${cleaned}"`);
    logger.info(`OCR recognized CAPTCHA: ${cleaned}`);

    // Clean up temp file if we created one
    if (imagePath && imagePath.includes("captcha-")) {
      try {
        fs.unlinkSync(imagePath);
        logger.debug("Temporary CAPTCHA image cleaned up");
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return cleaned;
  } catch (error) {
    logger.error(`CAPTCHA OCR failed: ${error.message}`);
    return null;
  }
}

/**
 * Extract CAPTCHA using multiple techniques
 * @param {Page} page - Playwright page object
 * @param {string} screenshotPath - Path to CAPTCHA screenshot
 * @returns {Promise<string>} - Extracted CAPTCHA code
 */
export async function extractCaptcha(page, screenshotPath) {
  logger.section("CAPTCHA Recognition");

  // Try OCR first
  const ocrResult = await recognizeCaptcha(page, screenshotPath);
  if (ocrResult && ocrResult.length >= 3) {
    logger.success(`✓ CAPTCHA recognized via OCR: ${ocrResult}`);
    return ocrResult;
  }

  logger.warn("OCR recognition failed or returned invalid result");
  return null;
}
