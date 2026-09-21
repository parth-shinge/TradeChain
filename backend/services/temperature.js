/**
 * Temperature validation service for cold chain compliance.
 */

/**
 * Validate a temperature reading against a maximum threshold.
 * @param {number} tempReading - Actual temperature in Celsius
 * @param {number} maxTemp - Maximum allowed temperature in Celsius (0 or null = no cold chain)
 * @returns {{ valid: boolean, violation: boolean, message: string }}
 */
function validateTemperature(tempReading, maxTemp) {
  if (tempReading === null || tempReading === undefined) {
    return { valid: false, violation: false, message: "Temperature reading is required" };
  }

  if (typeof tempReading !== "number" || isNaN(tempReading)) {
    return { valid: false, violation: false, message: "Temperature reading must be a number" };
  }

  // No cold chain requirement
  if (!maxTemp || maxTemp <= 0) {
    return { valid: true, violation: false, message: "No cold chain requirement" };
  }

  // Check violation
  if (tempReading > maxTemp) {
    return {
      valid: true,
      violation: true,
      message: `Cold chain violation: ${tempReading}°C exceeds maximum ${maxTemp}°C`,
    };
  }

  return {
    valid: true,
    violation: false,
    message: `Temperature ${tempReading}°C is within acceptable range (max ${maxTemp}°C)`,
  };
}

module.exports = { validateTemperature };
