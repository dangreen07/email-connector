import { Queue, Worker } from 'bullmq';
import { connection } from '../redis';
import { googleWatchRefresh } from './google';
import { azureSubRefresh } from './azure';
import { EmailMessage } from '../utils/types';
import { smtpImapListen } from './smtp-imap';

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = job.data as {
        environmentId: string;
        message: EmailMessage;
      };
    }
  },
  {
    connection: connection,
  },
);
