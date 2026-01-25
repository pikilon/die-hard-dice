// ============================================================================
// DICE THROWING LOGGER MODULE
// ============================================================================

/** @type {boolean} Enable/disable dice throwing logging */
export const LOG_THROWING = false;

/** @type {Array} Comprehensive logs for dice throwing debugging */
let throwLogs = [];

/**
 * Adds a log entry to the throwLogs array.
 * @param {string} title - The title of the log entry.
 * @param {Object} data - The data to log.
 */
export function addThrowLog(title, data) {
  if (LOG_THROWING) {
    const log = { title };
    log.data = data;
    log.timestamp = new Date().toISOString();

    throwLogs.push(log);
  }
}

/**
 * Clears the throwLogs array.
 */
export function clearThrowLogs() {
  throwLogs = [];
}

/**
 * Logs the current throwLogs array to console.
 */
export function logThrowData() {
  if (LOG_THROWING) {
    console.log("=== DICE THROW LOGS ===");
    console.log("THROW LOGS", throwLogs);
    console.log("=== END LOGS ===");
  }
}

/**
 * Gets the current throw logs array.
 * @returns {Array} The current throw logs.
 */
export function getThrowLogs() {
  return throwLogs;
}
