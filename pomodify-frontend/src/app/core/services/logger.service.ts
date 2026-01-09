import { Injectable } from '@angular/core';

/**
 * Logger service that suppresses all console output.
 * All logging is disabled to keep the console clean.
 * 
 * Usage:
 * - Replace console.log() with Logger.log()
 * - Replace console.warn() with Logger.warn()
 * - Replace console.error() with Logger.error()
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  /**
   * Log a message - suppressed
   */
  static log(..._args: unknown[]): void {
    // Logging disabled
  }

  /**
   * Log a warning - suppressed
   */
  static warn(..._args: unknown[]): void {
    // Logging disabled
  }

  /**
   * Log debug info - suppressed
   */
  static debug(..._args: unknown[]): void {
    // Logging disabled
  }

  /**
   * Log info - suppressed
   */
  static info(..._args: unknown[]): void {
    // Logging disabled
  }

  /**
   * Log an error - suppressed
   */
  static error(..._args: unknown[]): void {
    // Logging disabled
  }

  // Instance methods for dependency injection usage
  log(..._args: unknown[]): void {
    // Logging disabled
  }

  warn(..._args: unknown[]): void {
    // Logging disabled
  }

  debug(..._args: unknown[]): void {
    // Logging disabled
  }

  info(..._args: unknown[]): void {
    // Logging disabled
  }

  error(..._args: unknown[]): void {
    // Logging disabled
  }
}

/**
 * Standalone Logger object for quick imports without DI
 * Use: import { Logger } from './logger.service';
 */
export const Logger = {
  log: (..._args: unknown[]) => {},
  warn: (..._args: unknown[]) => {},
  debug: (..._args: unknown[]) => {},
  info: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
};
