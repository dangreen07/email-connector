import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import {
  Environment,
  environments,
  connections,
  connectedProviders,
  connectionCredentials,
} from '../db/schema';
import db from '../db';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { createRedisCachePlugin, hydrateTokenCache } from './redisCachePlugin';
import redis from '../redis';
import { getGraphClient } from './GraphAPI';
import { decrypt, encrypt } from '../encryption';
import {
  EmailMessage,
  GraphUser,
  IDPayload,
  SendEmail,
  StoredStateToken,
} from '../utils/types';
import { queue } from '../queues';

const scopes = [
  'Mail.Read',
  'Mail.Send',
  'offline_access',
  'openid',
  'profile',
  'email',
  'User.Read',
  'Mail.ReadWrite',
];

function createMsalClient(
  identifier: string,
  environmentId: string,
  clientId?: string,
  clientSecret?: string,
) {
  const msalConfig: Configuration = {
    auth: {
      clientId: clientId ?? process.env.AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/common`,
      clientSecret: clientSecret ?? process.env.AZURE_CLIENT_SECRET!,
    },
    cache: {
      cachePlugin: createRedisCachePlugin(identifier, environmentId),
    },
  };

  return new ConfidentialClientApplication(msalConfig);
}

export async function getOutlookOAuthLink(
  environment: Environment,
  identifier: string,
  redirectAfterAuth: string,
) {
  // Ensure no collision with existing state tokens
  let stateToken = '';
  while (true) {
    stateToken = crypto.randomUUID();

    const result = await redis.set(
      `outlook-state-token:${stateToken}`,
      JSON.stringify({
        environmentId: environment.id,
        identifier,
        redirectAfterAuth,
      }),
      {
        expiration: {
          type: 'EX',
          value: 2 * 60 * 60, // 2 hours
        },
        condition: 'NX',
      },
    );
    if (result === 'OK') {
      break;
    }
  }

  let client_id: string | undefined = undefined;
  let client_secret: string | undefined = undefined;
  if (environment.name == 'production') {
    const connectedProvider = await db
      .select()
      .from(connectedProviders)
      .where(
        and(
          eq(connectedProviders.providerCode, 'outlook'),
          eq(connectedProviders.environmentId, environment.id),
          eq(connectedProviders.enabled, true),
        ),
      )
      .then((val) => val.at(0) ?? null);
    if (!connectedProvider) {
      throw Error('Provider not enabled or does not exist for production!');
    }
    const encryptedCredentials = connectedProvider.credentials;
    if (!encryptedCredentials) {
      throw Error('Production provider requires credentials to be set!');
    }
    const credentials = JSON.parse(
      decrypt(encryptedCredentials, process.env.CRED_ENCRYPTION_KEY!),
    ) as {
      clientId: string;
      clientSecret: string;
    };
    client_id = credentials.clientId;
    client_secret = credentials.clientSecret;
  } else if (environment.name !== 'development') {
    throw Error('Invalid environment name!');
  }

  const pca = createMsalClient(
    identifier,
    environment.id,
    client_id,
    client_secret,
  );

  const authUrl = await pca.getAuthCodeUrl({
    scopes,
    redirectUri: `${process.env.API_URL}/v1/callback/outlook`,
    state: stateToken,
  });

  return authUrl;
}

export async function handleOutlookCallback(
  request: FastifyRequest,
  response: FastifyReply,
) {
  const code = (request.query as { code: string }).code;
  const state = (request.query as { state: string }).state;

  if (!code || !state) {
    return response.status(401).send({ error: 'Missing code or state' });
  }

  const stateToken: StoredStateToken | null = await redis
    .get(`outlook-state-token:${state}`)
    .then((data) => (data ? JSON.parse(data) : null));
  if (!stateToken) {
    return response
      .status(401)
      .send({ error: 'Invalid state token! It may have expired.' });
  }

  const environment = await db
    .select()
    .from(environments)
    .where(eq(environments.id, stateToken.environmentId))
    .then((rows) => rows.at(0) ?? null);
  if (!environment) {
    return response.status(401).send({ error: 'Invalid environment' });
  }

  let client_id: string | undefined = undefined;
  let client_secret: string | undefined = undefined;

  if (environment.name == 'production') {
    const connectedProvider = await db
      .select()
      .from(connectedProviders)
      .where(
        and(
          eq(connectedProviders.providerCode, 'outlook'),
          eq(connectedProviders.environmentId, environment.id),
          eq(connectedProviders.enabled, true),
        ),
      )
      .then((val) => val.at(0) ?? null);
    if (!connectedProvider) {
      throw Error('Provider not enabled or does not exist for production!');
    }
    const encryptedCredentials = connectedProvider.credentials;
    if (!encryptedCredentials) {
      throw Error('Production provider requires credentials to be set!');
    }
    const credentials = JSON.parse(
      decrypt(encryptedCredentials, process.env.CRED_ENCRYPTION_KEY!),
    ) as {
      clientId: string;
      clientSecret: string;
    };
    client_id = credentials.clientId;
    client_secret = credentials.clientSecret;
  } else if (environment.name != 'development') {
    return response.status(401).send({ error: 'Invalid environment' });
  }

  try {
    const pca = createMsalClient(
      stateToken.identifier,
      environment.id,
      client_id,
      client_secret,
    );

    const tokenResponse = await pca.acquireTokenByCode({
      code: code,
      scopes,
      redirectUri: `${process.env.API_URL}/v1/callback/outlook`,
    });

    const graphClient = getGraphClient(tokenResponse.accessToken);
    const profile: GraphUser = await graphClient.api('/me').get();
    const email = profile.mail ?? profile.userPrincipalName;

    await db.transaction(async (tx) => {
      // Check if any connections already connect to these credentials
      let result: {
        id: string;
      } | null = null;
      if (environment.name == 'production') {
        // In production, only check if credentials exist for this email and provider code for this environment id
        result = await tx
          .select({
            id: connectionCredentials.id,
          })
          .from(connectionCredentials)
          .innerJoin(
            connections,
            eq(connections.connectionCredentials, connectionCredentials.id),
          )
          .where(
            and(
              eq(connections.environmentId, environment.id),
              eq(connectionCredentials.email, email),
              eq(connectionCredentials.providerCode, 'gmail'),
            ),
          )
          .then((val) => val.at(0) ?? null);
      } else {
        result = await tx
          .select({
            id: connectionCredentials.id,
          })
          .from(connectionCredentials)
          .innerJoin(
            connections,
            eq(connections.connectionCredentials, connectionCredentials.id),
          )
          .innerJoin(
            environments,
            eq(environments.id, connections.environmentId),
          )
          .where(
            and(
              eq(environments.name, 'development'),
              eq(connectionCredentials.email, email),
              eq(connectionCredentials.providerCode, 'gmail'),
            ),
          )
          .limit(1) // Very important, as there could be dozens of these
          .then((val) => val.at(0) ?? null);
      }
      if (result) {
        // Now we should update the credentials
        await tx
          .update(connectionCredentials)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(connectionCredentials.id, result.id));
      } else {
        // Insert new credentials and a new connection
        const result = await tx
          .insert(connectionCredentials)
          .values({
            providerCode: 'gmail',
            email: email,
          })
          .returning({ id: connectionCredentials.id })
          .then((val) => val.at(0) ?? null);
        if (!result) {
          throw Error('Failed to insert connection credentials!');
        }
        await tx.insert(connections).values({
          environmentId: environment.id,
          identifier: stateToken.identifier,
          connectionCredentials: result.id,
        });
      }
    });

    const notificationUri =
      process.env.NODE_ENV == 'development'
        ? process.env.PROXY_URL
        : process.env.API_URL;

    // Needs to be refreshed every hour to keep alive!
    await graphClient.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl: `${notificationUri}/webhook/outlook/${environment.id}`, // must be HTTPS & publicly reachable
      resource: "me/mailFolders('inbox')/messages",
      expirationDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // max 1 hour for mail
      clientState: process.env.AZURE_WEBHOOK_STATE!,
    });

    await queue.add(
      'azure-sub-refresh',
      {
        environmentName: environment.name,
        environmentId: environment.id,
        identifier: stateToken.identifier,
      },
      {
        delay: 50 * 60 * 1000, // Refresh every 50 minutes
      },
    );

    await redis.del(`outlook-state-token:${state}`);

    return response.redirect(stateToken.redirectAfterAuth);
  } catch {
    return response.status(500).send({ error: 'Failed to acquire token' });
  }
}

// Re-acquire an Outlook access token using the MSAL cache persisted in Redis.
// Returns null if no cached account/token is available for the given identifier.
async function getOutlookAccessToken(
  identifier: string,
  environmentId: string,
  client_id?: string,
  client_secret?: string,
): Promise<string | null> {
  const pca = createMsalClient(
    identifier,
    environmentId,
    client_id,
    client_secret,
  );

  const tokenCache = pca.getTokenCache();
  // Ensure cache is hydrated from Redis for this identifier
  await hydrateTokenCache(identifier, environmentId, tokenCache);
  const accounts = await tokenCache.getAllAccounts();

  if (!accounts || accounts.length === 0) {
    return null;
  }

  const primaryAccount = accounts[0];

  try {
    const result = await pca.acquireTokenSilent({
      scopes,
      account: primaryAccount,
    });
    return result.accessToken;
  } catch {
    return null;
  }
}

export async function getAccessToken(
  environmentName: string,
  identifier: string,
  environmentId: string,
) {
  let accessToken: string | null = null;
  if (environmentName == 'development') {
    accessToken = await getOutlookAccessToken(identifier, environmentId);
  } else if (environmentName == 'production') {
    const connectedProvider = await db
      .select()
      .from(connectedProviders)
      .where(
        and(
          eq(connectedProviders.environmentId, environmentId),
          eq(connectedProviders.providerCode, 'outlook'),
          eq(connectedProviders.enabled, true),
        ),
      )
      .then((val) => val.at(0) ?? null);

    if (!connectedProvider) {
      throw Error('Cannot find Enabled Connected Provider!');
    }

    const encryptedCredentials = connectedProvider.credentials;
    if (!encryptedCredentials) {
      throw Error(
        'Provider Requires Credentials Configured in Production Mode!',
      );
    }
    const credentials = JSON.parse(
      decrypt(encryptedCredentials, process.env.CRED_ENCRYPTION_KEY!),
    ) as {
      clientId: string;
      clientSecret: string;
    };

    accessToken = await getOutlookAccessToken(
      identifier,
      environmentId,
      credentials.clientId,
      credentials.clientSecret,
    );
  }
  if (!accessToken) {
    throw new Error(
      'No Outlook access token available. Connect Outlook first.',
    );
  }
  return accessToken;
}

export async function getOutlookMessages(
  identifier: string,
  environmentId: string,
  limit: number = 10,
) {
  const environment = await db
    .select({ name: environments.name })
    .from(environments)
    .where(eq(environments.id, environmentId))
    .then((value) => value.at(0) ?? null);
  if (!environment) {
    throw Error('Environment not found!');
  }
  const accessToken = await getAccessToken(
    environment.name,
    identifier,
    environmentId,
  );

  const graphClient = getGraphClient(accessToken);
  const response = await graphClient
    .api('/me/messages')
    .top(Math.min(Math.max(limit, 1), 50))
    .orderby('receivedDateTime desc')
    .select(
      'id,internetMessageId,subject,from,sender,toRecipients,ccRecipients,bccRecipients,replyTo,sentDateTime,body,conversationId',
    )
    .get();

  return (response?.value ?? []).map((outlookMsg: unknown) =>
    outlookToGeneric(outlookMsg, identifier, environmentId),
  );
}
export async function getOutlookMessageById(
  identifier: string,
  environmentId: string,
  environmentName: string,
  providerId: string,
) {
  const accessToken = await getAccessToken(
    environmentName,
    identifier,
    environmentId,
  );

  const graphClient = getGraphClient(accessToken);

  const outlookMsg = await graphClient
    .api(`/me/messages/${providerId}`)
    .select(
      'id,internetMessageId,subject,from,sender,toRecipients,ccRecipients,bccRecipients,replyTo,sentDateTime,body,conversationId',
    )
    .get();

  return outlookToGeneric(outlookMsg, identifier, environmentId);
}

function outlookToGeneric(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outlookMsg: any,
  identifier: string,
  environmentId: string,
): EmailMessage {
  const payload = {
    providerId: outlookMsg.id,
    provider: 'outlook',
    identifier,
    environmentId,
  };
  const id = encrypt(JSON.stringify(payload), process.env.ID_CREATION_SECRET!);

  const conversationPayload = {
    providerId: outlookMsg.conversationId,
    provider: 'outlook',
    identifier,
    environmentId,
  };
  const conversationId = encrypt(
    JSON.stringify(conversationPayload),
    process.env.ID_CREATION_SECRET!,
  );

  return {
    id,
    messageId: outlookMsg.internetMessageId,
    subject: outlookMsg.subject,
    from: outlookMsg.from?.emailAddress,
    sender: outlookMsg.sender?.emailAddress,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    to: outlookMsg.toRecipients?.map((r: any) => r.emailAddress) || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cc: outlookMsg.ccRecipients?.map((r: any) => r.emailAddress) || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replyTo: outlookMsg.replyTo?.map((r: any) => r.emailAddress) || [],
    date: outlookMsg.sentDateTime,
    body: [
      {
        contentType:
          outlookMsg.body?.contentType?.toLowerCase() === 'html'
            ? 'html'
            : 'text',
        content: outlookMsg.body?.content || '',
      },
    ],
    thread: {
      conversationId,
      // conversationIndex is Outlook-specific, not RFC standard
    },
  };
}

export async function sendOutlookEmail(
  identifier: string,
  environmentId: string,
  environmentName: string,
  email: SendEmail,
) {
  const accessToken = await getAccessToken(
    environmentName,
    identifier,
    environmentId,
  );
  const client = getGraphClient(accessToken);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message: any = {
    subject: email.subject,
    body: {
      contentType: email.bodies[0].contentType === 'html' ? 'HTML' : 'Text',
      content: email.bodies[0].content,
    },
    toRecipients: email.to.map((t) => ({ emailAddress: t })),
    ccRecipients: email.cc?.map((c) => ({ emailAddress: c })),
    bccRecipients: email.bcc?.map((b) => ({ emailAddress: b })),
    attachments: email.attachments?.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.fileName,
      contentType: a.mimeType,
      contentBytes: a.content,
    })),
  };

  // Add threading headers if provided
  if (email.thread) {
    message.internetMessageHeaders = [];

    if (email.thread.inReplyTo) {
      message.internetMessageHeaders.push({
        name: 'In-Reply-To',
        value: email.thread.inReplyTo,
      });
    }

    if (email.thread.references) {
      message.internetMessageHeaders.push({
        name: 'References',
        value: email.thread.references,
      });
    }
  }

  // Step 1: Create Draft
  const draft = await client.api('/me/messages').post(message);

  // Step 2: Send it
  await client.api(`/me/messages/${draft.id}/send`).post({});

  const messageId = draft.internetMessageId;

  const payload: IDPayload = {
    providerId: messageId,
    provider: 'outlook',
    identifier: identifier,
    environmentId: environmentId,
  };

  const id = encrypt(JSON.stringify(payload), process.env.ID_CREATION_SECRET!);

  return id;
}

export async function handleOutlookWebhook(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: FastifyRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  response: FastifyReply,
) {
  // TODO: Complete the webhook handling
}
