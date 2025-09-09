import { config } from 'dotenv';
import Redis from 'ioredis';

config({ path: '.env' });

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export default redis;
