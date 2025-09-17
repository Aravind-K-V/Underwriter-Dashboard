import { Pool } from 'pg';
import dotenv from 'dotenv';
import { prettyLog } from './logger.js';

dotenv.config();

// Create a new PostgreSQL pool instance with connection details from .env
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// Test connection on first query (lazy initialization)
pool.on('connect', () => {
  prettyLog('Connected to local database successfully', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  });
});

pool.on('error', (err) => {
  prettyLog('Database connection error', { error: err.message, stack: err.stack });
});

export default pool;