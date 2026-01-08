import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Logger service that only outputs logs in development mode.
 * In production, only errors are logged to the console.
 * 
 * Usage:
 * - Replace console.log() with Logger.log()
 * - Replace console.warn() with Logger.warn()
 * - console.error() should remain as-is for production visibility
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private static isProduction = environment.production;

  /**
   * Log a message - only outputs in development mode
   */
  static log(...args: unknown[]): void {
    if (!LoggerService.isProduction) {
      console.log(...args);
    }
  }

  /**
   * Log a warning - only outputs in development mode
   */
  static warn(...args: unknown[]): void {
    if (!LoggerService.isProduction) {
      console.warn(...args);
    }
  }

  /**
   * Log debug info - only outputs in development mode
   */
  static debug(...args: unknown[]): void {
    if (!LoggerService.isProduction) {
      console.debug(...args);
    }
  }

  /**
   * Log info - only outputs in development mode
   */
  static info(...args: unknown[]): void {
    if (!LoggerService.isProduction) {
      console.info(...args);
    }
  }

  /**
   * Log an error - always outputs (even in production)
   */
  static error(...args: unknown[]): void {
    console.error(...args);
  }

  // Instance methods for dependency injection usage
  log(...args: unknown[]): void {
    LoggerService.log(...args);
  }

  warn(...args: unknown[]): void {
    LoggerService.warn(...args);
  }

  debug(...args: unknown[]): void {
    LoggerService.debug(...args);
  }

  info(...args: unknown[]): void {
    LoggerService.info(...args);
  }

  error(...args: unknown[]): void {
    LoggerService.error(...args);
  }
}

/**
 * Standalone Logger object for quick imports without DI
 * Use: import { Logger } from './logger.service';
 */
export const Logger = {
  log: (...args: unknown[]) => LoggerService.log(...args),
  warn: (...args: unknown[]) => LoggerService.warn(...args),
  debug: (...args: unknown[]) => LoggerService.debug(...args),
  info: (...args: unknown[]) => LoggerService.info(...args),
  error: (...args: unknown[]) => LoggerService.error(...args),
};
