import { clerkPlugin, getAuth } from '@clerk/fastify';
import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

fastify.register(clerkPlugin);

// Declare a route
fastify.get('/', async function handler (request, reply) {
    try {
        // Use `getAuth()` to get the user's ID
        const { userId } = getAuth(request);
        if (!userId) {
            reply.status(401).send({ error: 'Unauthorized' });
        }
        return { userId };
    }
    catch (error) {
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});

// Run the server!
async function start() {
  try {
    await fastify.listen({ port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();