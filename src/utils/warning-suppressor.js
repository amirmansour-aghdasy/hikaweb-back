import { logger } from './logger.js';

/**
 * Intelligent warning suppressor
 * Filters known non-critical warnings while preserving important ones
 */
class WarningManager {
  constructor() {
    this.suppressedWarnings = new Set([
      'WRN_ERL_DEPRECATED_ON_LIMIT_REACHED',
      'AWS_SDK_V2_MAINTENANCE_MODE',
      'MONGOOSE_DUPLICATE_INDEX'
    ]);

    this.warningSummary = new Map();
    this.setupWarningHandler();
  }

  setupWarningHandler() {
    const originalEmitWarning = process.emitWarning;

    process.emitWarning = (warning, type, code, ctor) => {
      // Check if this is a suppressed warning
      if (code && this.suppressedWarnings.has(code)) {
        this.trackSuppressedWarning(code, warning);
        return; // Suppress the warning
      }

      // Let other warnings through
      return originalEmitWarning.call(process, warning, type, code, ctor);
    };
  }

  trackSuppressedWarning(code, warning) {
    const count = this.warningSummary.get(code) || 0;
    this.warningSummary.set(code, count + 1);

    // Log summary periodically (not every occurrence)
    if (count === 0) {
      logger.debug(`Suppressed warning type: ${code} (first occurrence)`);
    }
  }

  getSummary() {
    return Object.fromEntries(this.warningSummary);
  }

  addSuppression(code) {
    this.suppressedWarnings.add(code);
  }

  removeSuppression(code) {
    this.suppressedWarnings.delete(code);
  }
}

// Initialize warning manager
export const warningManager = new WarningManager();

// Optional: Log summary on exit
process.on('exit', () => {
  const summary = warningManager.getSummary();
  if (Object.keys(summary).length > 0) {
    logger.info('Suppressed warnings summary:', summary);
  }
});
