import chalk from "chalk";
import fs from "fs";
import path from "path";
import config from "../../config/config.js";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LEVEL_NAMES = {
  0: "DEBUG",
  1: "INFO",
  2: "WARN",
  3: "ERROR"
};

const LOG_COLORS = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  success: chalk.green
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;
    this.logFile = config.logFile;
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (config.logToFile) {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  formatMessage(levelName, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${levelName}] ${message}`;
  }

  writeToFile(message) {
    if (config.logToFile) {
      fs.appendFileSync(this.logFile, message + "\n");
    }
  }

  log(level, message) {
    if (LOG_LEVELS[level] >= this.level) {
      const levelName = LEVEL_NAMES[LOG_LEVELS[level]];
      const formattedMsg = this.formatMessage(levelName, message);
      const color = LOG_COLORS[level] || chalk.white;

      console.log(color(formattedMsg));
      this.writeToFile(formattedMsg);
    }
  }

  debug(message) {
    this.log("debug", message);
  }

  info(message) {
    this.log("info", message);
  }

  warn(message) {
    this.log("warn", message);
  }

  error(message) {
    this.log("error", message);
  }

  success(message) {
    const timestamp = new Date().toISOString();
    const formattedMsg = this.formatMessage("SUCCESS", message);
    console.log(LOG_COLORS.success(formattedMsg));
    this.writeToFile(formattedMsg);
  }

  section(title) {
    const separator = "━".repeat(60);
    console.log("\n" + chalk.cyan(separator));
    console.log(chalk.cyan.bold(`  ${title}`));
    console.log(chalk.cyan(separator) + "\n");

    this.writeToFile(`\n${separator}\n${title}\n${separator}\n`);
  }
}

export const logger = new Logger();
