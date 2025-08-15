import Fastify from 'fastify';
import { connectedProviders, environments, stateTokens } from './db/schema';
import db from './db';
import { and, eq } from 'drizzle-orm';
import { getOutlookOAuthLink, handleOutlookCallback } from './outlook-connection';

const fastify = Fastify({
  logger: true
});

// Returns a link to the provider's OAuth page with a callback URL to our server
// The domain can be configured in future for production environments
fastify.post('/v1/connections', async function handler(request, response) {
  const body = request.body as {
    providerCode: string,
    publishableKey: string,
    identifier: string,
    redirectAfterAuth: string
  };
  const { providerCode, publishableKey, identifier, redirectAfterAuth } = body; // We can detect environment from the key

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
    // Use our own credentials
    switch (providerCode) {
      case "outlook":
        const authUrl = await getOutlookOAuthLink(environment, identifier, redirectAfterAuth);
        if (!authUrl) {
          return response.status(500).send({ error: 'Failed to get Outlook OAuth link' });
        }
        return response.status(200).send({ authUrl });
      case "gmail":
        break;
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

fastify.get('/v1/callback/outlook', handleOutlookCallback);

// Run the server!
async function start() {
  try {
    await fastify.listen({ port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();