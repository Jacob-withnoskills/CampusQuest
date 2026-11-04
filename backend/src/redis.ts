import { Redis } from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableReadyCheck: true
});

export async function checkRedis(): Promise<void> {
  if (redis.status === 'wait') await redis.connect();
  await redis.ping();
}