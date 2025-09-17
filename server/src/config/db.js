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
  console.info('[Database][Connection] Connected to local database successfully');
  prettyLog('Connected to local database successfully', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }, { level: 'info' });
});

pool.on('error', (err) => {
  console.error('[Database][Connection] Database connection error:', err.message);
  prettyLog('Database connection error', { error: err.message, stack: err.stack }, { level: 'error' });
});

export default pool;