import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Logger {
  constructor() {
    this.logs = [];
    
    // Configure Winston logger
    this.winston = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'youtube-livestream' },
      transports: [
        // Write to all logs with level `info` and below
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/combined.log') 
        }),
        // Console output for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });
  }

  info(message, meta = {}) {
    const logEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    this.logs.push(logEntry);
    this.winston.info(message, meta);
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  error(message, error = null) {
    const logEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };
    
    this.logs.push(logEntry);
    this.winston.error(message, error);
    
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  warn(message, meta = {}) {
    const logEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    this.logs.push(logEntry);
    this.winston.warn(message, meta);
    
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  debug(message, meta = {}) {
    const logEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    this.logs.push(logEntry);
    this.winston.debug(message, meta);
    
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  getLogs(limit = 100) {
    return this.logs.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
    this.winston.info('Logs cleared');
  }
}