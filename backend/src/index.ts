import Fastify from 'fastify';
import { connectedProviders, environments, oauthConnections } from './db/schema';
import db from './db';
import { and, eq } from 'drizzle-orm';
import { getOutlookMessages, getOutlookOAuthLink, handleOutlookCallback } from './azure/outlook-connection';
import { getGmailMessages, getGmailOauthLink, handleGmailCallback } from './google/gmail-connection';
import redis from './redis';

const fastify = Fastify({
  logger: true
});

// Returns a link to the provider's OAuth page with a callback URL to our server
// The domain can be configured in future for production environments
fastify.get('/v1/connection', async function handler(request, response) {
  const headers = request.headers;
  const authorization = headers.authorization;
  if (!authorization) {
    return response.status(401).send({ error: 'Missing authorization header' });
  }
  const publishableKey = authorization.split(" ")[1];
  const query = request.query as {
    providerCode: string,
    identifier: string,
    redirectAfterAuth: string
  };
  let { providerCode, identifier, redirectAfterAuth } = query; // We can detect environment from the key
  redirectAfterAuth = decodeURIComponent(redirectAfterAuth);

  if (!publishableKey) {
    return response.status(401).send({ error: 'Missing publishable key' });
  }

  const environment = await db.select().from(environments).where(eq(environments.publishableKey, publishableKey)).then((rows) => rows.at(0) ?? null);
  if (!environment) {
    return response.status(401).send({ error: 'Invalid publishable key' });
  }

  // Check if the provider is enabled
  const connectedProvider = await db.select().from(connectedProviders).where(and(eq(connectedProviders.environmentId, environment.id), eq(connectedProviders.providerCode, providerCode), eq(connectedProviders.enabled, true))).then((rows) => rows.at(0) ?? null);
  if (!connectedProvider) {
    return response.status(401).send({ error: 'Provider not enabled' });
  }

  if (environment.name === "development") {
    let authUrl: string | null = null;
    // Use our own credentials
    switch (providerCode) {
      case "outlook":
        authUrl = await getOutlookOAuthLink(environment, identifier, redirectAfterAuth);
        if (!authUrl) {
          return response.status(500).send({ error: 'Failed to get Outlook OAuth link' });
        }
        return response.status(200).send({ authUrl });
      case "gmail":
        authUrl = await getGmailOauthLink(environment, identifier, redirectAfterAuth);
        if (!authUrl) {
          return response.status(500).send({ error: 'Failed to get Gmail OAuth link' });
        }
        return response.status(200).send({ authUrl });
      case "smtp-imap":
        break;
      default:
        return response.status(401).send({ error: 'Invalid provider code' });
    }
  }
  else {
    // TODO: Handle production environment
  }
});

fastify.get('/v1/messages', async function handler(request, response) {
  const headers = request.headers;
  const authorization = headers.authorization;
  if (!authorization) {
    return response.status(401).send({ error: 'Missing authorization header' });
  }
  const secretKey = authorization.split(" ")[1];

  const {
    identifier,
    providerCode,
    limit = 10,
    offset = 0,
    search = ""
  } = request.query as {
    identifier: string,
    providerCode: string,
    limit?: number,
    offset?: number,
    search?: string
  };

  if (!secretKey || !identifier || !providerCode) {
    return response.status(401).send({ error: 'Missing required parameters' });
  }

  // Check whether the publishable and secret key are valid and get the oauth connection
  const oauthConnection = await db.select()
    .from(oauthConnections)
    .innerJoin(environments, eq(oauthConnections.environmentId, environments.id))
    .where(
      and(
        eq(oauthConnections.providerCode, providerCode),
        eq(oauthConnections.identifier, identifier),
        eq(environments.secretKey, secretKey),
      )).limit(1).then((rows) => rows.at(0)?.oauth_connections ?? null);
  if (!oauthConnection) {
    return response.status(401).send({ error: 'Could not find a valid connection' });
  }

  switch (providerCode) {
    case "outlook":
      try {
        const messages = await getOutlookMessages(identifier, oauthConnection.environmentId, limit);
        return response.status(200).send({ messages });
      } catch (err: any) {
        // Propagate helpful error info from Graph
        const errorMessage = err?.message || "Failed to fetch Outlook messages";
        const statusCode = err?.statusCode || 500;
        request.log.error(err, errorMessage);
        return response.status(statusCode).send({ error: errorMessage, code: err?.code });
      }

    case "gmail":
      try {
        const messages = await getGmailMessages(identifier, oauthConnection.environmentId, limit);
        return response.status(200).send({ messages });
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to fetch Gmail messages";
        const statusCode = err?.statusCode || 500;
        request.log.error(err, errorMessage);
        return response.status(statusCode).send({ error: errorMessage, code: err?.code });
      }
    case "smtp-imap":
      break;
    default:
      return response.status(401).send({ error: 'Invalid provider code' });
  }

  return response.status(200).send("OK");
});

fastify.get('/v1/messages/:id', async function handler(request, response) {
  const { id } = request.params as { id: string };
})

// Callback endpoints
fastify.get('/v1/callback/outlook', handleOutlookCallback);
fastify.get('/v1/callback/gmail', handleGmailCallback);

// Run the server!
async function start() {
  await redis.connect();

  try {
    await fastify.listen({ port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();