import { Queue, Worker } from 'bullmq';
import { connection } from '../redis';
import { ConnectionCredentials } from '../db/schema';
import { decrypt } from '../encryption';
import { EmailMessage, SMTPIMAPCredentials } from '../utils/types';
import { ImapFlow, MailboxObject } from 'imapflow';
import { smtpIMAPFlowToGeneric } from '../smtp-imap/smtp-imap-connection';

export const IMAPListener = new Queue('imap-listener', {
  connection: connection,
});

// Currently without distributed locks it works for having one server instance
// Also this method is not able to withstand a restart during the period of accepting jobs
new Worker(
  'imap-listener',
  async (job) => {
    if (job.name == 'start-listen') {
      const data = job.data as {
        environmentId: string;
        identifier: string;
        connection: ConnectionCredentials;
      };
      const encryptedCredentials = data.connection.credentials;
      if (!encryptedCredentials) {
        return;
      }
      const credentials = JSON.parse(
        decrypt(encryptedCredentials, process.env.CRED_ENCRYPTION_KEY!),
      ) as SMTPIMAPCredentials;

      const client = new ImapFlow({
        host: credentials.imapServer,
        port: credentials.imapPort,
        secure: credentials.useSSL,
        auth: {
          user: credentials.email,
          pass: credentials.password,
        },
      });

      await client.connect();

      await client.mailboxOpen('INBOX');

      client.on('exists', async () => {
        // New email arrived
        for await (const msg of client.fetch(
          { seq: (client.mailbox as MailboxObject).exists },
          { envelope: true },
        )) {
          // Send webhook notification
          const message = await smtpIMAPFlowToGeneric(
            msg,
            data.identifier,
            data.environmentId,
          );
          IMAPListener.add('webhook-notify', message);
        }
      });
    } else if (job.name == 'webhook-notify') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const data = job.data as {
        environmentId: string;
        message: EmailMessage;
      };
      // TODO: Handle webhooks
    }
  },
  {
    connection: connection,
  },
);
