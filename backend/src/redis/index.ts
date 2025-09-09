import { config } from 'dotenv';
import Redis from 'ioredis';

config({ path: '.env' });

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  reconnectOnError: (err) => {
    // Force reconnect on certain errors
    const targetErrors = ['READONLY', 'ECONNRESET'];
    return targetErrors.some((e) => err.message.includes(e));
  },
  retryStrategy: (times) => {
    // Reconnect after
    return Math.min(times * 50, 2000); // max 2 seconds backoff
  },
});

export default redis;
