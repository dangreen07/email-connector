import { createClient } from 'redis';
import { config } from 'dotenv';
import IORedis from 'ioredis';

config({ path: '.env' });

const url = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = createClient({
  url,
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

export default redis;

export const connection = new IORedis(url, { maxRetriesPerRequest: null });
