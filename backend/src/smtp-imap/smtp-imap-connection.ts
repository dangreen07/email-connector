import db from '../db';
import { connections, Environment } from '../db/schema';
import { encrypt } from '../encryption';
import { SMTPIMAPCredentials } from '../types';

export async function connectSMTPIMAP(
  environment: Environment,
  identifier: string,
  smtpCredentials: SMTPIMAPCredentials,
) {
  // Store the credentials in the database, encrypted with aes-256-gcm
  const credentials = encrypt(
    JSON.stringify(smtpCredentials),
    process.env.CRED_ENCRYPTION_KEY!,
  );

  db.insert(connections)
    .values({
      environmentId: environment.id,
      providerCode: 'smtp-imap',
      identifier,
      credentials,
    })
    .onConflictDoUpdate({
      target: [
        connections.environmentId,
        connections.providerCode,
        connections.identifier,
      ],
      set: { credentials },
    })
    .returning();
}
