import { Queue, Worker } from 'bullmq';
import { getGoogleClient } from '../google/gmail-connection';
import db from '../db';
import {
  connectedProviders,
  connectionCredentials,
  connections,
} from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { google } from 'googleapis';
import redis from '../redis';
import { decrypt } from '../encryption';
import { GmailCredentials } from '../utils/types';

export const watchRefresh = new Queue('watchRefresh', {
  connection: redis,
});

export const webhookNotify = new Queue('webhookNotify', {
  connection: redis,
});

new Worker(
  'watchRefresh',
  async (job) => {
    const data = job.data as {
      identifier: string;
      environmentId: string;
      environmentName: string;
    };

    const client = await getGoogleClient(
      data.environmentName,
      data.environmentId,
    );

    const connection = await db
      .select()
      .from(connections)
      .innerJoin(
        connectionCredentials,
        eq(connectionCredentials.id, connections.connectionCredentials),
      )
      .where(
        and(
          eq(connections.identifier, data.identifier),
          eq(connections.environmentId, data.environmentId),
          eq(connectionCredentials.providerCode, 'gmail'),
        ),
      )
      .limit(1)
      .then((val) => val.at(0) ?? null);

    if (
      !connection?.connection_credentials?.accessToken ||
      !connection.connection_credentials?.refreshToken
    ) {
      console.error(
        'User connection for gmail must have access token and refresh token!',
      );
      return;
    }
    client.setCredentials({
      access_token: connection.connection_credentials.accessToken,
      refresh_token: connection.connection_credentials.refreshToken,
      expiry_date: connection.connection_credentials.expiresAt?.getTime(),
    });

    let topicName = process.env.GOOGLE_TOPIC_NAME!;
    if (data.environmentName == 'production') {
      const provider = await db
        .select()
        .from(connectedProviders)
        .where(
          and(
            eq(connectedProviders.environmentId, data.environmentId),
            eq(connectedProviders.enabled, true),
          ),
        )
        .then((val) => val.at(0) ?? null);
      if (!provider) {
        return;
      }
      const encryptedCredentials = provider.credentials;
      if (!encryptedCredentials) {
        return;
      }
      const credentials = JSON.parse(
        decrypt(encryptedCredentials, process.env.CRED_ENCRYPTION_KEY!),
      ) as GmailCredentials;

      topicName = credentials.topicName;
    }

    const gmail = google.gmail({ version: 'v1', auth: client });

    const watchResult = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topicName,
        labelIds: ['INBOX'],
      },
    });

    const currentDatetime = new Date().getTime();

    const historyId = watchResult.data.historyId;
    const expirationDate = watchResult.data.expiration;

    if (!historyId || !expirationDate) {
      return;
    }

    redis.set(
      `gmail-history-id:${data.environmentId}:${data.identifier}`,
      historyId,
    );

    await watchRefresh.add(
      'watch-refresh',
      {
        identifier: data.identifier,
        environmentId: data.environmentId,
        environmentName: data.environmentName,
      },
      {
        delay: Number(expirationDate) - currentDatetime - 60 * 60 * 1000, // Subtract 1 hour to ensure no gap period of notifications
      },
    );
  },
  {
    connection: redis,
  },
);

new Worker(
  'webhookNotify',
  async (job) => {
    // TODO: Implement
  },
  {
    connection: redis,
  },
);
