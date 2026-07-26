#!/usr/bin/env node

/**
 * TTD Booking Automation - Main Entry Point
 * Displays menu and runs selected scripts
 */

import readline from "readline";
import chalk from "chalk";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.clear();
  console.log(chalk.cyan.bold("\n╔═══════════════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("║  TTD Srivani Ticket Booking Automation (Guided)  ║"));
  console.log(chalk.cyan.bold("╚═══════════════════════════════════════════════════╝\n"));

  console.log(chalk.white("Choose an option:\n"));
  console.log(chalk.blue("  1. Login to TTD Account"));
  console.log(chalk.blue("  2. Book Srivani Tickets (if logged in)"));
  console.log(chalk.blue("  3. Full Flow (Login + Booking)"));
  console.log(chalk.blue("  4. Interactive Guide"));
  console.log(chalk.blue("  5. Verify Setup"));
  console.log(chalk.blue("  6. Exit\n"));

  const choice = await question(chalk.bold.green("Enter choice (1-6): "));

  rl.close();

  const scripts = {
    1: "scripts/login.js",
    2: "scripts/book-tickets.js",
    3: "scripts/full-flow.js",
    4: "scripts/interactive.js",
    5: "verify-setup.js"
  };

  if (choice === "6") {
    console.log(chalk.yellow("\nGoodbye!\n"));
    process.exit(0);
  }

  const script = scripts[choice];
  if (!script) {
    console.log(chalk.red("\nInvalid choice!\n"));
    process.exit(1);
  }

  console.log(chalk.cyan(`\nRunning: ${script}\n`));

  const child = spawn("node", [path.join(__dirname, script)], {
    cwd: __dirname,
    stdio: "inherit"
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.log(chalk.red(`\nScript exited with code ${code}`));
    }
    process.exit(code);
  });
}

main().catch(console.error);
