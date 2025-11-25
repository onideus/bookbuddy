"use strict";
/**
 * Input sanitization utilities to prevent XSS attacks and ensure data consistency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeObject = sanitizeObject;
/**
 * Sanitizes a string by trimming whitespace and escaping HTML entities
 * @param input - The string to sanitize
 * @returns Sanitized string with trimmed whitespace and escaped HTML entities
 */
function sanitizeString(input) {
    if (!input)
        return input;
    return input
        .trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
/**
 * Sanitizes an email by normalizing it (lowercase and trim)
 * @param input - The email to sanitize
 * @returns Normalized email (lowercase and trimmed)
 */
function sanitizeEmail(input) {
    if (!input)
        return input;
    return input.trim().toLowerCase();
}
/**
 * Sanitizes specified string fields in an object
 * @param obj - The object to sanitize
 * @param stringFields - Array of field names to sanitize
 * @returns New object with sanitized string fields
 */
function sanitizeObject(obj, stringFields) {
    const result = { ...obj };
    for (const field of stringFields) {
        if (typeof result[field] === 'string') {
            result[field] = sanitizeString(result[field]);
        }
    }
    return result;
}
