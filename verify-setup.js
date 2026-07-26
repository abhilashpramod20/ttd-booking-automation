#!/usr/bin/env node

/**
 * TTD Booking Automation - Setup Verification Script
 * Checks if all dependencies and configurations are ready
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function check(condition, message, details = "") {
  if (condition) {
    console.log(chalk.green(`✓ ${message}`));
    if (details) console.log(chalk.gray(`  ${details}`));
  } else {
    console.log(chalk.red(`✗ ${message}`));
    if (details) console.log(chalk.gray(`  ${details}`));
  }
  return condition;
}

async function verify() {
  console.log(chalk.cyan.bold("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
  console.log(chalk.cyan.bold("TTD Booking Automation - Setup Verification\n"));
  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  let allGood = true;

  // Check Node modules
  console.log(chalk.blue.bold("1. Dependencies:"));
  const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")));
  const nodeModules = path.join(__dirname, "node_modules");
  allGood &= check(fs.existsSync(nodeModules), "node_modules installed", "npm install was run");

  // Check Playwright
  const playwrightPath = path.join(nodeModules, "playwright");
  allGood &= check(fs.existsSync(playwrightPath), "Playwright installed", "Required for browser automation");

  // Check config file
  console.log("\n" + chalk.blue.bold("2. Configuration:"));
  const configExample = path.join(__dirname, "config", "config.example.js");
  const config = path.join(__dirname, "config", "config.js");

  allGood &= check(fs.existsSync(configExample), "config.example.js exists", "Template provided");

  if (fs.existsSync(config)) {
    check(true, "config.js exists", "You've configured credentials");

    // Check if still using template values
    const configContent = fs.readFileSync(config, "utf-8");
    const hasDefaultValues =
      configContent.includes("YOUR_USERNAME") || configContent.includes("YOUR_PASSWORD");

    if (hasDefaultValues) {
      check(false, "config.js uses template values", chalk.yellow("Edit config.js with your credentials"));
      allGood = false;
    } else {
      check(true, "config.js has custom values", "Credentials configured");
    }
  } else {
    check(false, "config.js missing", "Run: cp config/config.example.js config/config.js");
    allGood = false;
  }

  // Check scripts
  console.log("\n" + chalk.blue.bold("3. Scripts:"));
  const scripts = ["login.js", "book-tickets.js", "full-flow.js", "interactive.js"];
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, "scripts", script);
    allGood &= check(fs.existsSync(scriptPath), script, "Ready to run");
  }

  // Check utilities
  console.log("\n" + chalk.blue.bold("4. Utilities:"));
  const utils = ["browser.js", "logger.js", "prompts.js"];
  for (const util of utils) {
    const utilPath = path.join(__dirname, "scripts", "utils", util);
    allGood &= check(fs.existsSync(utilPath), util, "Supporting module");
  }

  // Check directories
  console.log("\n" + chalk.blue.bold("5. Directories:"));
  const dirs = ["screenshots", "logs"];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    allGood &= check(fs.existsSync(dirPath), `${dir}/`, "Output directory ready");
  }

  // Summary
  console.log("\n" + chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  if (allGood) {
    console.log(chalk.green.bold("✓ All systems ready!\n"));
    console.log(chalk.green("Next steps:"));
    console.log("  1. Edit config/config.js with your TTD credentials");
    console.log("  2. Run: npm run login");
    console.log("  3. Check the browser window and approve each step\n");
  } else {
    console.log(chalk.red.bold("✗ Setup incomplete. Fix issues above.\n"));
    console.log(chalk.yellow("Quick fixes:"));
    console.log("  1. npm install");
    console.log("  2. cp config/config.example.js config/config.js");
    console.log("  3. Edit config/config.js with your credentials\n");
  }

  console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

  process.exit(allGood ? 0 : 1);
}

verify();
