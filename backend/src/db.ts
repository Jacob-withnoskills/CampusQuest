import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 15,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export async function checkDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}
