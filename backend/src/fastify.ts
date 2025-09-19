import { FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import { clerkPlugin } from '@clerk/fastify';

const ALLOWED_ORIGINS = [process.env.FRONTEND_URL || 'http://localhost:3000'];

export async function startServer(fastify: FastifyInstance) {
  try {
    await fastify.register(rawBody, {
      field: 'rawBody', // makes request.rawBody available
      global: false, // only enabled on routes you opt into
      encoding: 'utf8', // gives a string (Stripe accepts string or Buffer)
      runFirst: true, // ensure this runs before other content type parsers
    });
    await fastify.register(cors, {
      origin: (origin, cb) => {
        // allow server-to-server or CLI requests with no Origin
        if (!origin) return cb(null, true);

        // exact allowed list
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);

        // convenience for local dev (localhost:3000, :3001, etc.)
        if (origin.startsWith('http://localhost:')) return cb(null, true);

        // reject otherwise
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
    await fastify.register(clerkPlugin);
    await fastify.listen({ host: '0.0.0.0', port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}
