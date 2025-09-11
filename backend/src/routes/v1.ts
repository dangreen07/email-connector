import { FastifyInstance } from 'fastify';
import {
  connectedProviders,
  environments,
  connections,
  connectionCredentials,
} from '../db/schema';
import db from '../db';
import { and, eq } from 'drizzle-orm';
import {
  getOutlookMessages,
  getOutlookOAuthLink,
  handleOutlookCallback,
  getOutlookMessageById,
  sendOutlookEmail,
  handleOutlookWebhookProd,
} from '../azure/outlook-connection';
import {
  getGmailMessages,
  getGmailOauthLink,
  handleGmailCallback,
  getGmailMessageById,
  sendGmailEmail,
  handleGmailWebhook as handleGmailWebhookProd,
} from '../google/gmail-connection';
import { decrypt } from '../encryption';
import {
  connectSMTPIMAP,
  getSMTPIMAPMessageById,
  getSMTPIMAPMessages,
  sendSMTPIMAPEmail,
} from '../smtp-imap/smtp-imap-connection';
import { SendEmail, SMTPIMAPCredentials } from '../utils/types';
import { insertLog } from '../utils/logs';

export default async function v1Routes(fastify: FastifyInstance) {
  // Returns a link to the provider's OAuth page with a callback URL to our server
  // The domain can be configured in future for production environments
  // This is a post request to accomodate sending user credentials for SMTP/IMAP connections
  fastify.post('/connection', async function handler(request, response) {
    const headers = request.headers;
    const authorization = headers.authorization;
    if (!authorization) {
      return response
        .status(401)
        .send({ error: 'Missing authorization header' });
    }
    const publishableKey = authorization.split(' ')[1];
    const query = request.query as {
      providerCode: string;
      identifier: string;
      redirectAfterAuth: string;
    };
    const { providerCode, identifier } = query; // We can detect environment from the key
    let { redirectAfterAuth } = query;
    redirectAfterAuth = decodeURIComponent(redirectAfterAuth);
    let smtpCredentials: SMTPIMAPCredentials | null = null;
    if (providerCode === 'smtp-imap') {
      smtpCredentials = request.body as SMTPIMAPCredentials;
      if (
        !smtpCredentials ||
        !smtpCredentials.smtpServer ||
        !smtpCredentials.smtpPort ||
        !smtpCredentials.imapServer ||
        !smtpCredentials.imapPort ||
        !smtpCredentials.email ||
        !smtpCredentials.password
      ) {
        return response
          .status(400)
          .send({ error: 'Missing SMTP/IMAP connection parameters in body' });
      }

      if (!smtpCredentials.useSSL) {
        smtpCredentials.useSSL = true;
      }
    }

    if (!publishableKey) {
      return response.status(401).send({ error: 'Missing publishable key' });
    }

    const environment = await db
      .select()
      .from(environments)
      .where(eq(environments.publishableKey, publishableKey))
      .then((rows) => rows.at(0) ?? null);
    if (!environment) {
      return response.status(401).send({ error: 'Invalid publishable key' });
    }
    const _log_start = Date.now();

    // Check if the provider is enabled
    const connectedProvider = await db
      .select()
      .from(connectedProviders)
      .where(
        and(
          eq(connectedProviders.environmentId, environment.id),
          eq(connectedProviders.providerCode, providerCode),
          eq(connectedProviders.enabled, true),
        ),
      )
      .then((rows) => rows.at(0) ?? null);
    if (!connectedProvider) {
      return response.status(401).send({ error: 'Provider not enabled' });
    }

    if (
      environment.name === 'development' ||
      environment.name === 'production'
    ) {
      let authUrl: string | null = null;
      // Use our own credentials
      switch (providerCode) {
        case 'outlook':
          authUrl = await getOutlookOAuthLink(
            environment,
            identifier,
            redirectAfterAuth,
          );
          if (!authUrl) {
            await insertLog({
              environmentId: environment.id,
              route: '/connection',
              method: 'POST',
              status: 'error',
              httpStatus: 500,
              durationMs: Date.now() - _log_start,
              payloadObject: {
                providerCode,
                identifier,
                error: 'Failed to get Outlook OAuth link',
              },
            }).catch((err) => request.log.error(err, 'Failed to insert log'));
            return response
              .status(500)
              .send({ error: 'Failed to get Outlook OAuth link' });
          }
          insertLog({
            environmentId: environment.id,
            route: '/connection',
            method: 'POST',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start,
            payloadObject: {
              providerCode,
              identifier,
              redirectAfterAuth,
              authUrl,
            },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ authUrl });
        case 'gmail':
          authUrl = await getGmailOauthLink(
            environment,
            identifier,
            redirectAfterAuth,
          );
          if (!authUrl) {
            await insertLog({
              environmentId: environment.id,
              route: '/connection',
              method: 'POST',
              status: 'error',
              httpStatus: 500,
              durationMs: Date.now() - _log_start,
              payloadObject: {
                providerCode,
                identifier,
                error: 'Failed to get Gmail OAuth link',
              },
            }).catch((err) => request.log.error(err, 'Failed to insert log'));
            return response
              .status(500)
              .send({ error: 'Failed to get Gmail OAuth link' });
          }
          insertLog({
            environmentId: environment.id,
            route: '/connection',
            method: 'POST',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start,
            payloadObject: {
              providerCode,
              identifier,
              redirectAfterAuth,
              authUrl,
            },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ authUrl });
        case 'smtp-imap':
          if (!smtpCredentials) {
            await insertLog({
              environmentId: environment.id,
              route: '/connection',
              method: 'POST',
              status: 'error',
              httpStatus: 400,
              durationMs: Date.now() - _log_start,
              payloadObject: {
                providerCode,
                identifier,
                error: 'Missing SMTP/IMAP connection parameters in body',
              },
            }).catch((err) => request.log.error(err, 'Failed to insert log'));
            return response.status(400).send({
              error: 'Missing SMTP/IMAP connection parameters in body',
            });
          }
          // Directly connect without OAuth
          try {
            await connectSMTPIMAP(environment, identifier, smtpCredentials);
            insertLog({
              environmentId: environment.id,
              route: '/connection',
              method: 'POST',
              status: 'success',
              httpStatus: 200,
              durationMs: Date.now() - _log_start,
              payloadObject: {
                providerCode,
                identifier,
                message: 'SMTP/IMAP connected successfully',
              },
            }).catch((err) => request.log.error(err, 'Failed to insert log'));
            return response
              .status(200)
              .send({ message: 'SMTP/IMAP connected successfully' });
          } catch (err) {
            request.log.error(err, 'Failed to connect SMTP/IMAP');
            await insertLog({
              environmentId: environment.id,
              route: '/connection',
              method: 'POST',
              status: 'error',
              httpStatus: 500,
              durationMs: Date.now() - _log_start,
              payloadObject: { providerCode, identifier, error: String(err) },
            }).catch((e) => request.log.error(e, 'Failed to insert log'));
            return response
              .status(500)
              .send({ error: 'Failed to connect SMTP/IMAP' });
          }
        default:
          return response.status(401).send({ error: 'Invalid provider code' });
      }
    } else {
      throw Error('Invalid Environment!');
    }
  });

  // Get messages
  fastify.get('/messages', async function handler(request, response) {
    const headers = request.headers;
    const authorization = headers.authorization;
    if (!authorization) {
      return response
        .status(401)
        .send({ error: 'Missing authorization header' });
    }
    const secretKey = authorization.split(' ')[1];

    const {
      identifier,
      providerCode,
      limit = 10,
      // TODO: Implement offset and search
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      offset = 0,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      search = '',
    } = request.query as {
      identifier: string;
      providerCode: string;
      limit?: number;
      offset?: number;
      search?: string;
    };

    if (!secretKey || !identifier || !providerCode) {
      return response
        .status(401)
        .send({ error: 'Missing required parameters' });
    }

    // Check whether the publishable and secret key are valid and get the oauth connection
    const connection = await db
      .select({
        connections: {
          environmentId: connections.environmentId,
        },
      })
      .from(connections)
      .innerJoin(environments, eq(connections.environmentId, environments.id))
      .innerJoin(
        connectionCredentials,
        eq(connectionCredentials.id, connections.connectionCredentials),
      )
      .where(
        and(
          eq(connectionCredentials.providerCode, providerCode),
          eq(connections.identifier, identifier),
          eq(environments.secretKey, secretKey),
        ),
      )
      .limit(1)
      .then((rows) => rows.at(0)?.connections ?? null);
    if (!connection) {
      return response
        .status(401)
        .send({ error: 'Could not find a valid connection' });
    }

    const _log_start = Date.now();
    switch (providerCode) {
      case 'outlook':
        try {
          const messages = await getOutlookMessages(
            identifier,
            connection.environmentId,
            limit,
          );
          insertLog({
            environmentId: connection.environmentId,
            route: '/messages',
            method: 'GET',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start,
            payloadObject: { provider: 'outlook', identifier, messages },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ messages });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          // Propagate helpful error info from Graph
          const errorMessage =
            err?.message || 'Failed to fetch Outlook messages';
          const statusCode = err?.statusCode || 500;
          request.log.error(err, errorMessage);
          insertLog({
            environmentId: connection.environmentId,
            route: '/messages',
            method: 'GET',
            status: 'error',
            httpStatus: statusCode,
            durationMs: Date.now() - _log_start,
            payloadObject: {
              provider: 'outlook',
              identifier,
              error: errorMessage,
            },
          }).catch((e) => request.log.error(e, 'Failed to insert log'));
          return response
            .status(statusCode)
            .send({ error: errorMessage, code: err?.code });
        }

      case 'gmail':
        try {
          const messages = await getGmailMessages(
            identifier,
            connection.environmentId,
            limit,
          );
          insertLog({
            environmentId: connection.environmentId,
            route: '/messages',
            method: 'GET',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start,
            payloadObject: { provider: 'gmail', identifier, messages },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ messages });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          const errorMessage = err?.message || 'Failed to fetch Gmail messages';
          const statusCode = err?.statusCode || 500;
          request.log.error(err, errorMessage);
          insertLog({
            environmentId: connection.environmentId,
            route: '/messages',
            method: 'GET',
            status: 'error',
            httpStatus: statusCode,
            durationMs: Date.now() - _log_start,
            payloadObject: {
              provider: 'gmail',
              identifier,
              error: errorMessage,
            },
          }).catch((e) => request.log.error(e, 'Failed to insert log'));
          return response
            .status(statusCode)
            .send({ error: errorMessage, code: err?.code });
        }
      case 'smtp-imap':
        try {
          const messages = await getSMTPIMAPMessages(
            identifier,
            connection.environmentId,
            limit,
          );
          insertLog({
            environmentId: connection.environmentId,
            route: '/messages',
            method: 'GET',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start,
            payloadObject: { provider: 'smtp-imap', identifier, messages },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ messages });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          console.error(err);
          insertLog({
            environmentId: connection.environmentId,
            route: '/messages',
            method: 'GET',
            status: 'error',
            httpStatus: 500,
            durationMs: Date.now() - _log_start,
            payloadObject: {
              provider: 'smtp-imap',
              identifier,
              error: String(err),
            },
          }).catch((e) => request.log.error(e, 'Failed to insert log'));
          return response
            .status(500)
            .send({ error: 'Failed to fetch SMTP/IMAP messages' });
        }
      default:
        return response.status(401).send({ error: 'Invalid provider code' });
    }
  });

  // Get an email
  fastify.get('/messages/by-id', async function handler(request, response) {
    const headers = request.headers;
    const authorization = headers.authorization;
    if (!authorization) {
      return response
        .status(401)
        .send({ error: 'Missing authorization header' });
    }
    const secretKey = authorization.split(' ')[1];

    const { id } = request.query as { id: string };

    if (!secretKey || !id) {
      return response
        .status(401)
        .send({ error: 'Missing required parameters' });
    }

    // Decrypt the message id to extract provider payload
    let payload: {
      providerId: string;
      provider: string;
      identifier: string;
      environmentId: string;
    };
    try {
      const decoded = decrypt(id, process.env.ID_CREATION_SECRET!);
      payload = JSON.parse(decoded);
    } catch (err) {
      request.log.error(err, 'Invalid message id');
      return response.status(400).send({ error: 'Invalid message id' });
    }

    // Validate the secret key belongs to the same environment as in the id payload
    const environment = await db
      .select()
      .from(environments)
      .where(eq(environments.secretKey, secretKey))
      .then((rows) => rows.at(0) ?? null);

    if (!environment || environment.id !== payload.environmentId) {
      return response
        .status(401)
        .send({ error: 'Could not find a valid connection' });
    }
    const _log_start_by_id = Date.now();

    const { providerId, provider, identifier, environmentId } = payload;

    try {
      switch (provider) {
        case 'outlook': {
          const message = await getOutlookMessageById(
            identifier,
            environmentId,
            environment.name,
            providerId,
          );
          insertLog({
            environmentId,
            route: '/messages/by-id',
            method: 'GET',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start_by_id,
            payloadObject: {
              provider: 'outlook',
              identifier,
              messageId: providerId,
              message,
            },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ message });
        }
        case 'gmail': {
          const message = await getGmailMessageById(
            identifier,
            environmentId,
            providerId,
          );
          insertLog({
            environmentId,
            route: '/messages/by-id',
            method: 'GET',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start_by_id,
            payloadObject: {
              provider: 'gmail',
              identifier,
              messageId: providerId,
              message,
            },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ message });
        }
        case 'smtp-imap': {
          const message = await getSMTPIMAPMessageById(
            identifier,
            environmentId,
            providerId,
          );
          insertLog({
            environmentId,
            route: '/messages/by-id',
            method: 'GET',
            status: 'success',
            httpStatus: 200,
            durationMs: Date.now() - _log_start_by_id,
            payloadObject: {
              provider: 'smtp-imap',
              identifier,
              messageId: providerId,
              message,
            },
          }).catch((err) => request.log.error(err, 'Failed to insert log'));
          return response.status(200).send({ message });
        }
        default:
          return response.status(401).send({ error: 'Invalid provider code' });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch message';
      const statusCode = err?.statusCode || 500;
      request.log.error(err, errorMessage);
      return response
        .status(statusCode)
        .send({ error: errorMessage, code: err?.code });
    }
  });

  // Send an email
  fastify.post('/messages', async function handler(request, response) {
    const headers = request.headers;
    const authorization = headers.authorization;
    if (!authorization) {
      return response
        .status(401)
        .send({ error: 'Missing authorization header' });
    }
    const secretKey = authorization.split(' ')[1];

    const query = request.query as {
      identifier: string;
      providerCode: string;
    };

    const email = request.body as SendEmail;

    const environment = await db
      .select()
      .from(environments)
      .where(eq(environments.secretKey, secretKey))
      .then((rows) => rows.at(0) ?? null);

    if (!environment) {
      return response
        .status(401)
        .send({ error: 'Could not find a valid connection' });
    }
    const _log_start_post = Date.now();

    let result = '';
    switch (query.providerCode) {
      case 'gmail':
        result = await sendGmailEmail(
          query.identifier,
          environment.id,
          environment.name,
          email,
        );
        insertLog({
          environmentId: environment.id,
          route: '/messages',
          method: 'POST',
          status: 'success',
          httpStatus: 200,
          durationMs: Date.now() - _log_start_post,
          payloadObject: {
            provider: 'gmail',
            identifier: query.identifier,
            email,
            emailId: result,
          },
        }).catch((err) => request.log.error(err, 'Failed to insert log'));
        return response.status(200).send({ emailId: result });
      case 'outlook':
        result = await sendOutlookEmail(
          query.identifier,
          environment.id,
          environment.name,
          email,
        );
        insertLog({
          environmentId: environment.id,
          route: '/messages',
          method: 'POST',
          status: 'success',
          httpStatus: 200,
          durationMs: Date.now() - _log_start_post,
          payloadObject: {
            provider: 'outlook',
            identifier: query.identifier,
            email,
            emailId: result,
          },
        }).catch((err) => request.log.error(err, 'Failed to insert log'));
        return response.status(200).send({ emailId: result });
      case 'smtp-imap':
        result = await sendSMTPIMAPEmail(
          query.identifier,
          environment.id,
          email,
        );
        insertLog({
          environmentId: environment.id,
          route: '/messages',
          method: 'POST',
          status: 'success',
          httpStatus: 200,
          durationMs: Date.now() - _log_start_post,
          payloadObject: {
            provider: 'smtp-imap',
            identifier: query.identifier,
            email,
            emailId: result,
          },
        }).catch((err) => request.log.error(err, 'Failed to insert log'));
        return response.status(200).send({ emailId: result });
      default:
        return response
          .status(500)
          .send({ error: 'Provider is not supported!' });
    }
  });

  // Callback endpoints
  fastify.get('/callback/outlook', handleOutlookCallback);
  fastify.get('/callback/gmail', handleGmailCallback);

  // Webhook endpoints
  // Production
  fastify.post('/webhook/gmail/:environmentId', handleGmailWebhookProd);
  fastify.post('/webhook/outlook/:environmentId', handleOutlookWebhookProd);
  // Development
}
