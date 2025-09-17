import { Job } from 'bullmq';
import { ConnectionCredentials } from '../db/schema';
import { decrypt } from '../encryption';
import { SMTPIMAPCredentials } from '../utils/types';
import { ImapFlow, MailboxObject } from 'imapflow';
import { smtpIMAPFlowToGeneric } from '../smtp-imap/smtp-imap-connection';
import { queue } from '.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const smtpImapListen = async (job: Job<any, any, string>) => {
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
      queue.add('webhook-notify', message, {
        removeOnComplete: true,
      });
    }
  });
};
