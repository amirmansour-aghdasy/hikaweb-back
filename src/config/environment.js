export const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT,
    API_VERSION: process.env.API_VERSION || 'v1',
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hikaweb',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    
    // External Services
    KAVENEGAR_LOOKUP: process.env.KAVENEGAR_LOOKUP,
    KAVENEGAR_API_KEY: process.env.KAVENEGAR_API_KEY,
    KAVENEGAR_SENDER: process.env.KAVENEGAR_SENDER,
    
    // Bale Bot (جایگزین Telegram)
    BALE_BOT_TOKEN: process.env.BALE_BOT_TOKEN,
    BALE_ADMIN_CHAT_IDS: process.env.BALE_ADMIN_CHAT_IDS, // Comma-separated
    
    // Arvan Drive (Legacy - for backward compatibility)
    ARVAN_DRIVE_ACCESS_KEY: process.env.ARVAN_DRIVE_ACCESS_KEY,
    ARVAN_DRIVE_SECRET_KEY: process.env.ARVAN_DRIVE_SECRET_KEY,
    ARVAN_DRIVE_BUCKET: process.env.ARVAN_DRIVE_BUCKET,
    ARVAN_DRIVE_REGION: process.env.ARVAN_DRIVE_REGION || 'ir-thr-at1',
    
    // Arvan Object Storage (New)
    ARVAN_OBJECT_STORAGE_API_KEY: process.env.ARVAN_OBJECT_STORAGE_API_KEY,
    ARVAN_OBJECT_STORAGE_ACCESS_KEY: process.env.ARVAN_OBJECT_STORAGE_ACCESS_KEY,
    ARVAN_OBJECT_STORAGE_SECRET_KEY: process.env.ARVAN_OBJECT_STORAGE_SECRET_KEY,
    ARVAN_OBJECT_STORAGE_BUCKET: process.env.ARVAN_OBJECT_STORAGE_BUCKET,
    ARVAN_OBJECT_STORAGE_REGION: process.env.ARVAN_OBJECT_STORAGE_REGION,
    
    // Security
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Feature Flags
    ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
    ENABLE_BALE: process.env.ENABLE_BALE !== 'false' && !!process.env.BALE_BOT_TOKEN,
    ENABLE_REDIS_RATE_LIMITING: process.env.ENABLE_REDIS_RATE_LIMITING !== 'false',
    SUPPRESS_WARNINGS: process.env.SUPPRESS_WARNINGS === 'true' || process.env.NODE_ENV === 'production',
    
    // Monitoring
    LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false'
  };