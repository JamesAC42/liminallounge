/**
 * Validates user input for content safety and length requirements
 * @param {Object} input - Object containing fields to validate
 * @param {Object} rules - Object containing validation rules for each field
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export function validateInput(input, rules) {
    for (const [field, value] of Object.entries(input)) {
        const fieldRules = rules[field];
        if (!fieldRules) continue;

        // Skip validation if field is optional and not provided
        if (fieldRules.optional && !value) continue;

        // Check if required field is missing
        if (!fieldRules.optional && !value) {
            return {
                isValid: false,
                error: `${field} is required`
            };
        }

        // Validate length
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            return {
                isValid: false,
                error: `${field} must not exceed ${fieldRules.maxLength} characters`
            };
        }

        // Validate content is not just whitespace
        if (fieldRules.noWhitespace && value.trim().length === 0) {
            return {
                isValid: false,
                error: `${field} cannot be empty or just whitespace`
            };
        }

        // Basic XSS prevention
        if (fieldRules.preventXSS && 
            (value.includes('<script') || value.includes('javascript:'))) {
            return {
                isValid: false,
                error: `Invalid ${field}`
            };
        }
    }

    return { isValid: true, error: null };
}
