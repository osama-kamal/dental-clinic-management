import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logFilePath: string;

  constructor() {
    const logDir = app.getPath('logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFilePath = path.join(logDir, 'app.log');
  }

  private writeLog(entry: LogEntry): void {
    const logLine = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}${
      entry.data ? ' ' + JSON.stringify(entry.data) : ''
    }\n`;

    // Write to file
    fs.appendFileSync(this.logFilePath, logLine);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(logLine.trim());
    }
  }

  info(message: string, data?: any): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
    });
  }

  warn(message: string, data?: any): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
    });
  }

  error(message: string, data?: any): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data,
    });
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.writeLog({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        data,
      });
    }
  }
}

export const logger = new Logger();
