import logger from './src/utils/logger.js';

console.log('--- Logger Redaction Test ---');

const sensitiveData = {
    user: 'Test User',
    token: '12345-abcde-secret-token',
    password: 'supersecretpassword',
    chat_id: 987654321
};

console.log('Attempting to log sensitive data:');
logger.info('Sensitive Data Object:', sensitiveData);
logger.info('Connection String: mongodb://user:supersecretpassword@localhost:27017/db');
logger.info('API Response: {"token": "12345-abcde-secret-token", "status": "ok"}');
logger.warn('Auth Error: Invalid token=ABC-123-XYZ');

console.log('--- End Test ---');
