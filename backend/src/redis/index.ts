import { createClient } from "redis";
import { config } from "dotenv";

config({ path: ".env" });

const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.connect();

export default redis;