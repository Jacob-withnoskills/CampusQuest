import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: required('HOST', '0.0.0.0'),
  port: Number(required('PORT', '4000')),
  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL', 'redis://127.0.0.1:6379'),
  frontendOrigin: required('FRONTEND_ORIGIN', 'http://localhost:5173')
};
