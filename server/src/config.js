import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const BOT_TOKEN = process.env.BOT_TOKEN || 'SAMPLE_BOT_TOKEN_FOR_DEV';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const ADS_ENABLED = process.env.ADS_ENABLED === 'true';
export const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '7622124912';