import Fastify from 'fastify';
import v1Routes from './routes/v1';
import redis from './redis';
import db from './db';
import { connectionCredentials, connections } from './db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { IMAPListener } from './queues/smtp-imap';

const fastify = Fastify({
  logger: true,
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
    await IMAPListener.add('imap-listener', connection);
  }

  try {
    await fastify.listen({ host: '0.0.0.0', port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();
