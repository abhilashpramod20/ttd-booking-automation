import readline from "readline";
import chalk from "chalk";
import { logger } from "./logger.js";

let rl = null;

function getReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });
  }
  return rl;
}

export function prompt(question) {
  return new Promise((resolve, reject) => {
    const readline = getReadline();
    if (!readline || readline.closed) {
      reject(new Error("Readline interface is not available"));
      return;
    }
    
    readline.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

export async function requireApproval(stepName, details = "") {
  logger.section(`Step: ${stepName}`);

  console.log(chalk.cyan("📋 Details:"));
  if (details) {
    console.log(chalk.white(details));
  }

  console.log(chalk.yellow("\n⚠️  Please verify the action above in the browser window."));
  console.log(chalk.cyan("\nThe browser is paused and waiting for your approval.\n"));

  let approved = false;
  let attempts = 0;

  while (!approved && attempts < 3) {
    const answer = await prompt(chalk.bold.green("Ready to proceed? (yes/no): "));

    if (answer === "yes" || answer === "y") {
      logger.success(`✓ Approved: ${stepName}`);
      approved = true;
    } else if (answer === "no" || answer === "n") {
      logger.warn(`✗ Cancelled: ${stepName}`);
      throw new Error(`User cancelled at step: ${stepName}`);
    } else {
      console.log(chalk.red("Please enter 'yes' or 'no'"));
      attempts++;
    }
  }

  if (!approved) {
    throw new Error("Too many invalid attempts");
  }

  return approved;
}

export async function selectFromList(question, options) {
  logger.section(question);

  options.forEach((option, index) => {
    console.log(chalk.cyan(`  ${index + 1}. ${option}`));
  });

  let selection = null;
  while (!selection) {
    const answer = await prompt(chalk.bold.green("\nEnter selection (number): "));
    const index = parseInt(answer) - 1;

    if (index >= 0 && index < options.length) {
      selection = options[index];
      logger.success(`Selected: ${selection}`);
    } else {
      console.log(chalk.red(`Invalid selection. Please enter 1-${options.length}`));
    }
  }

  return selection;
}

export async function enterText(question, hint = "") {
  logger.section(question);
  if (hint) {
    console.log(chalk.gray(`Hint: ${hint}`));
  }

  try {
    const answer = await prompt(chalk.bold.green("Enter value: "));
    if (answer.trim()) {
      logger.success(`✓ Entered: ${answer.toUpperCase()}`);
      return answer.trim();
    } else {
      console.log(chalk.red("Input cannot be empty"));
      return enterText(question, hint);
    }
  } catch (error) {
    console.log(chalk.red(`\n✗ Error reading input: ${error.message}`));
    throw error;
  }
}

export async function waitForEnter(question, hint = "") {
  logger.section(question);
  if (hint) {
    console.log(chalk.gray(`Hint: ${hint}`));
  }

  try {
    await prompt(chalk.bold.green("Press ENTER to continue: "));
    logger.success("✓ Continuing...");
    return true;
  } catch (error) {
    console.log(chalk.red(`\n✗ Error reading input: ${error.message}`));
    throw error;
  }
}

export function closePrompt() {
  if (rl && !rl.closed) {
    rl.close();
    rl = null;
  }
}

export function printInfo(message, isSuccess = false) {
  const color = isSuccess ? chalk.green : chalk.blue;
  console.log(color(message));
}

export function printError(message) {
  console.log(chalk.red(`✗ Error: ${message}`));
}

export function printWarning(message) {
  console.log(chalk.yellow(`⚠️  ${message}`));
}
