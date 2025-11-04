/**
 * Utility functions for MCP server
 *
 * This file contains helper functions used across the MCP server.
 * Add your own utility functions here to keep code organized.
 */

/**
 * Error handler - standardizes error responses
 * @param {Error} error - Error object to handle
 * @returns {Object} Standardized error response
 */
function handleError(error) {
    console.error('Error occurred:', error.message);

    return {
        success: false,
        isError: true,
        error: error.message,
        timestamp: new Date().toISOString()
    };
}

/**
 * Validate string input
 * @param {string} input - String to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateString(input, fieldName = 'Input') {
    if (!input || typeof input !== 'string') {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
    return true;
}

/**
 * Validate number input
 * @param {number} input - Number to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateNumber(input, fieldName = 'Input', min = null, max = null) {
    if (typeof input !== 'number' || isNaN(input)) {
        throw new Error(`${fieldName} must be a valid number`);
    }

    if (min !== null && input < min) {
        throw new Error(`${fieldName} must be at least ${min}`);
    }

    if (max !== null && input > max) {
        throw new Error(`${fieldName} must be at most ${max}`);
    }

    return true;
}

/**
 * Format response object
 * @param {boolean} success - Whether operation was successful
 * @param {Object} data - Response data
 * @param {string} message - Optional message
 * @returns {Object} Formatted response
 */
function formatResponse(success, data, message = null) {
    const response = {
        success,
        data,
        timestamp: new Date().toISOString()
    };

    if (message) {
        response.message = message;
    }

    return response;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, i);
            console.error(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
            await sleep(delay);
        }
    }
}

/**
 * Sanitize string for safe output
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
    if (typeof str !== 'string') {
        return str;
    }

    // Remove control characters and trim
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === 'string') {
        return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }

    return false;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated string
 */
function truncate(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) {
        return str;
    }

    return str.substring(0, maxLength - suffix.length) + suffix;
}

module.exports = {
    handleError,
    validateString,
    validateNumber,
    formatResponse,
    sleep,
    retryWithBackoff,
    sanitizeString,
    isEmpty,
    deepClone,
    truncate
};
