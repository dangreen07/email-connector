import { Queue, Worker } from 'bullmq';
import { connection } from '../redis';
import { googleWatchRefresh } from './google';
import { azureSubRefresh } from './azure';
import { EmailMessage } from '../utils/types';
import { smtpImapListen } from './smtp-imap';
import db from '../db';
import { webhooks } from '../db/schema';
import { eq } from 'drizzle-orm';

export const queue = new Queue('queue', {
  connection: connection,
});

new Worker(
  'queue',
  async (job) => {
    if (job.name == 'google-watch-refresh') {
      await googleWatchRefresh(job);
    } else if (job.name == 'azure-sub-refresh') {
      await azureSubRefresh(job);
    } else if (job.name == 'smtp-imap-start-listen') {
      await smtpImapListen(job);
    } else if (job.name == 'webhook-notify') {
      const data = job.data as {
        environmentId: string;
        message: EmailMessage;
      };

      const webhookList = await db
        .select({
          endpointUrl: webhooks.endpointUrl,
        })
        .from(webhooks)
        .where(eq(webhooks.environmentId, data.environmentId));

      await Promise.all(
        webhookList.map((webhook) => {
          return fetch(webhook.endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data.message),
          });
        }),
      );
    }
  },
  {
    connection: connection,
  },
);
