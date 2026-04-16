/**
 * Secure Logger Utility
 * Wraps console methods to redact sensitive information like tokens, IDs, and connection strings.
 */

const SENSITIVE_KEYS = [
    'token',
    'password',
    'pass',
    'secret',
    'key',
    'authorization',
    'mongo_uri',
    'mongodb_uri',
    'uri',
    'connection_string',
    'user_id',
    'chat_id',
    'id', // Aggressive
    'uid',
    'telegramid',
    'telegram_id',
    'channelid',
    'channel_id',
    'adminid',
    'admin_id',
    'partnerid',
    'partner_id'
];

// Regex to find potential sensitive values in strings (like "Token: 12345")
const SENSITIVE_REGEX = new RegExp(`(${SENSITIVE_KEYS.join('|')})[:\\s=_"']+\\s*([^\\s,}"']+)`, 'gi');

/**
 * Redacts sensitive data from an object recursively.
 * @param {any} input 
 * @returns {any} Redacted copy of the input
 */
const redact = (input) => {
    if (!input) return input;

    if (typeof input === 'string') {
        return input.replace(SENSITIVE_REGEX, (match, key, value) => {
            return `${key}: [REDACTED]`;
        });
    }

    if (Array.isArray(input)) {
        return input.map(item => redact(item));
    }

    if (typeof input === 'object') {
        const redactedObj = {};
        for (const [key, value] of Object.entries(input)) {
            const lowerKey = key.toLowerCase();
            const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey));

            if (isSensitive) {
                redactedObj[key] = '[REDACTED]';
            } else {
                redactedObj[key] = redact(value);
            }
        }
        return redactedObj;
    }

    return input;
};

const logger = {
    log: (...args) => {
        console.log(...args.map(redact));
    },
    error: (...args) => {
        console.error(...args.map(redact));
    },
    warn: (...args) => {
        console.warn(...args.map(redact));
    },
    info: (...args) => {
        console.log(...args.map(redact));
    }
};

export default logger;
