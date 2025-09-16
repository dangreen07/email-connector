import Fastify from 'fastify';
import v1Routes from './routes/v1';
import redis from './redis';
import db from './db';
import {
  connectionCredentials,
  connections,
  environments,
  projects,
} from './db/schema';
import { and, eq, isNotNull, or } from 'drizzle-orm';
import { queue } from './queues';
import { clerkPlugin } from '@clerk/fastify';
import rateLimit from '@fastify/rate-limit';

const fastify = Fastify({
  logger: true,
});

fastify.register(clerkPlugin);
fastify.register(rateLimit, {
  keyGenerator: async (req) => {
    const headers = req.headers;
    const authorization = headers.authorization;
    const key = authorization?.split(' ')[1];
    if (!key) {
      return req.ip; // If no key, return IP
    }
    let userId: string | null = null;

    userId = await redis.get(`apiKey:${key}:userId`);
    if (!userId) {
      const result = await db
        .select({ userId: projects.userId })
        .from(projects)
        .innerJoin(environments, eq(environments.projectId, projects.id))
        .where(
          or(
            eq(environments.publishableKey, key),
            eq(environments.secretKey, key),
          ),
        )
        .then((val) => val.at(0) ?? null);
      if (!result) {
        // They have an invalid key
        return req.ip;
      }
      userId = result.userId;
    }
    return userId;
  },
  global: false, // Disable automatic global rate limiting
});

const LOGGED_ENDPOINTS = [
  '/v1/connection',
  '/v1/messages',
  '/v1/messages/by-id',
];

fastify.addHook('onResponse', async (req, reply) => {
  const route = req.originalUrl ?? req.url;
  if (!LOGGED_ENDPOINTS.includes(route)) {
    return; // skip logging for this route
  }
  const headers = req.headers;
  const authorization = headers.authorization;
  if (!authorization) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }
  const key = authorization.split(' ')[1];
  if (!key) {
    return; // Skip logging for unauthorized endpoints
  }

  let environmentId: string | null = null;

  // Try redis first
  environmentId = await redis.get(`apikey:${key}:env`);

  // Fallback to postgres
  if (!environmentId) {
    const result = await db
      .select({ id: environments.id })
      .from(environments)
      .where(
        or(
          eq(environments.publishableKey, key),
          eq(environments.secretKey, key),
        ),
      )
      .then((val) => val.at(0) ?? null);
    if (!result) {
      return; // Failed to find in db
    }
    environmentId = result.id;
    // Store in redis with a TTL
    await redis.set(`apikey:${key}:env`, environmentId, {
      expiration: {
        type: 'EX',
        value: 60 * 60, // 1 hour TTL
      },
    });
  }
  await redis.incr(`api-calls:${environmentId}`); // Record the API calls a user has made
  await queue.add('log', {
    environmentId,
    route,
    method: req.method,
    statusCode: reply.statusCode,
    time: new Date(),
    duration: reply.elapsedTime,
    query: req.query,
    body: req.body,
  });
});

fastify.register(v1Routes, { prefix: '/v1' });

fastify.get('/health', (request, response) => {
  return response.status(200).send('I am alive! Yippeee!');
});

// Run the server!
async function start() {
  await redis.connect();

  const smtpIMAPConnections = await db
    .select({
      environmentId: connections.environmentId,
      identifier: connections.identifier,
      connection: connectionCredentials,
    })
    .from(connectionCredentials)
    .innerJoin(
      connections,
      eq(connections.connectionCredentials, connectionCredentials.id),
    )
    .where(
      and(
        eq(connectionCredentials.providerCode, 'smtp-imap'),
        isNotNull(connectionCredentials.credentials),
      ),
    );

  for (const connection of smtpIMAPConnections) {
    await queue.add('smtp-imap-start-listen', connection);
  }

  try {
    await fastify.listen({ host: '0.0.0.0', port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();
