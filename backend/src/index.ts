import Fastify from 'fastify';
import { connectedProviders, environments, oauthConnections } from './db/schema';
import db from './db';
import { and, eq } from 'drizzle-orm';
import { getOutlookMessages, getOutlookOAuthLink, handleOutlookCallback } from './azure/outlook-connection';
import { getGmailMessages, getGmailOauthLink, handleGmailCallback } from './google/gmail-connection';

const fastify = Fastify({
  logger: true
});

// Returns a link to the provider's OAuth page with a callback URL to our server
// The domain can be configured in future for production environments
fastify.post('/v1/connections', async function handler(request, response) {
  const body = request.body as {
    credentials: {
      publishableKey: string,
    },
    providerCode: string,
    identifier: string,
    redirectAfterAuth: string
  };
  const { providerCode, credentials, identifier, redirectAfterAuth } = body; // We can detect environment from the key

  if (!credentials.publishableKey) {
    return response.status(401).send({ error: 'Missing publishable key' });
  }

  const environment = await db.select().from(environments).where(eq(environments.publishableKey, credentials.publishableKey)).then((rows) => rows.at(0) ?? null);
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

fastify.post('/v1/messages', async function handler(request, response) {
  const {
    credentials: {
      publishableKey,
      secretKey,
    },
    identifier,
    providerCode,
    limit = 10,
    offset = 0,
    search = ""
  } = request.body as {
    credentials: {
      publishableKey: string,
      secretKey: string,
    },
    identifier: string,
    providerCode: string,
    limit?: number,
    offset?: number,
    search?: string
  };

  if (!publishableKey || !identifier || !secretKey || !providerCode) {
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
        eq(environments.publishableKey, publishableKey),
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


// Callback endpoints
fastify.get('/v1/callback/outlook', handleOutlookCallback);
fastify.get('/v1/callback/gmail', handleGmailCallback);

// Run the server!
async function start() {
  try {
    await fastify.listen({ port: 8080 });
  } catch (err) {
    fastify.log.error(err);
  }
}

start();