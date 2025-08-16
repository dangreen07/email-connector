import Redis from "ioredis";
import { config } from "dotenv";

config({ path: ".env" });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export function createRedisCachePlugin(identifier: string) {
    const cacheKey = `msal-cache:${identifier}`;

    return {
        beforeCacheAccess: async (cacheContext: any) => {
            const data = await redis.get(cacheKey);
            if (data) {
                cacheContext.tokenCache.deserialize(data);
            }
        },
        afterCacheAccess: async (cacheContext: any) => {
            if (cacheContext.cacheHasChanged) {
                const data = cacheContext.tokenCache.serialize();
                await redis.set(cacheKey, data);
            }
        },
    };
}

export async function hydrateTokenCache(identifier: string, tokenCache: any) {
    const cacheKey = `msal-cache:${identifier}`;
    const data = await redis.get(cacheKey);
    if (data) {
        tokenCache.deserialize(data);
    }
}