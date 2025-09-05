import Fastify from 'fastify';
import redis from './redis';
import v1Routes from './routes/v1';

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

  try {
    await fastify.listen({ host: '0.0.0.0', port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();
