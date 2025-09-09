import redis from '../redis';

export function createRedisCachePlugin(
  identifier: string,
  environmentId: string,
) {
  const cacheKey = `msal-cache:${environmentId}:${identifier}`;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeCacheAccess: async (cacheContext: any) => {
      const data = await redis.get(cacheKey);
      if (data) {
        cacheContext.tokenCache.deserialize(data);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterCacheAccess: async (cacheContext: any) => {
      if (cacheContext.cacheHasChanged) {
        const data = cacheContext.tokenCache.serialize();
        await redis.set(cacheKey, data);
      }
    },
  };
}

export async function hydrateTokenCache(
  identifier: string,
  environmentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokenCache: any,
) {
  const cacheKey = `msal-cache:${environmentId}:${identifier}`;
  const data = await redis.get(cacheKey);
  if (data) {
    tokenCache.deserialize(data);
  }
}
