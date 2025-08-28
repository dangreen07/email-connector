import db from '../db';
import { connections, Environment } from '../db/schema';
import { decrypt, encrypt } from '../encryption';
import { ensureArray, parseImapBody, strToEmailAddress } from '../utils';
import { eq, and } from 'drizzle-orm';
import { connect, Message } from 'imap-simple';
import {
  EmailAddress,
  EmailMessage,
  IDPayload,
  SMTPIMAPCredentials,
  Body,
  Attachment,
} from '../utils/types';
import { simpleParser } from 'mailparser';

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

  const result = await db
    .insert(connections)
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

  if (result.length === 0) {
    throw new Error('Failed to insert connection');
  }
}

export async function getSMTPIMAPMessages(
  identifier: string,
  environmentId: string,
  limit = 10,
): Promise<EmailMessage[]> {
  const connection = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.identifier, identifier),
        eq(connections.environmentId, environmentId),
        eq(connections.providerCode, 'smtp-imap'),
      ),
    )
    .then((rows) => rows.at(0) ?? null);

  if (!connection || !connection.credentials) {
    console.error('No connection found for this identifier');
    throw new Error('No connection found for this identifier');
  }
  const credentials = decrypt(
    connection.credentials,
    process.env.CRED_ENCRYPTION_KEY!,
  );
  const decryptedCredentials: SMTPIMAPCredentials = JSON.parse(credentials);

  const client = await connect({
    imap: {
      user: decryptedCredentials.email,
      host: decryptedCredentials.imapServer,
      port: decryptedCredentials.imapPort,
      tls: decryptedCredentials.useSSL,
      password: decryptedCredentials.password,
    },
  });

  await client.openBox('INBOX');

  const allUids = await client.search(['ALL'], {
    bodies: [],
  });
  if (allUids.length === 0) {
    return [];
  }
  const uids = allUids.map((uid) => uid.attributes.uid);
  const latestUids = uids.slice(-limit);
  const uidRange = `${Math.min(...latestUids)}:${Math.max(...latestUids) + 1}`; // Inclusive start, non-inclusive end

  let messages = await client.search([['UID', uidRange]], {
    bodies: [''],
    struct: true,
    markSeen: false,
  });
  messages = messages.sort(
    (a, b) => b.attributes.date.getTime() - a.attributes.date.getTime(),
  );

  await client.closeBox(true);
  client.end();
  return Promise.all(
    messages.map((message) =>
      smtpImapToGeneric(message, identifier, environmentId),
    ),
  );
}

export async function getSMTPIMAPMessageById(
  identifier: string,
  environmentId: string,
  providerId: string,
) {
  // TODO: Implement
}

async function smtpImapToGeneric(
  message: Message,
  identifier: string,
  environmentId: string,
): Promise<EmailMessage> {
  const email = await simpleParser(
    message.parts.find((part) => part.which === 'RFC822' || part.which === '')
      ?.body,
  );

  let providerId = {
    type: 'uid',
    value: message.attributes.uid.toString(),
  };
  if (email.messageId) {
    providerId = {
      type: 'message-id',
      value: email.messageId,
    };
  }

  const payload: IDPayload = {
    providerId: encrypt(
      JSON.stringify(providerId),
      process.env.ID_CREATION_SECRET!,
    ),
    provider: 'smtp-imap',
    identifier: identifier,
    environmentId: environmentId,
  };
  const id = encrypt(JSON.stringify(payload), process.env.ID_CREATION_SECRET!);
  const subject = email.subject;
  const from =
    email.from?.value.map((value) => {
      return {
        name: value.name,
        address: value.address ?? '',
      };
    }) ?? [];
  let sender: EmailAddress;
  const senderHeader = email.headers.get('sender')?.toString();
  if (senderHeader) {
    sender = strToEmailAddress(senderHeader);
  } else {
    sender = from[0];
  }
  const to = ensureArray(email.to)
    .map((value) => {
      let adresses = value.value.map((v) => {
        return {
          name: v.name,
          address: v.address ?? '',
        };
      });
      return adresses;
    })
    .flat();
  const cc = ensureArray(email.cc)
    .map((value) => {
      let adresses = value.value.map((v) => {
        return {
          name: v.name,
          address: v.address ?? '',
        };
      });
      return adresses;
    })
    .flat();
  const replyTo =
    email.replyTo?.value.map((value) => {
      return {
        name: value.name,
        address: value.address ?? '',
      };
    }) ?? [];
  const bodies: Body[] = [];
  if (email.text) {
    bodies.push({
      contentType: 'text' as const,
      content: email.text,
    });
  }

  if (email.html) {
    bodies.push({
      contentType: 'html' as const,
      content: email.html,
    });
  }

  const attachments: Attachment[] = email.attachments.map((attachment) => {
    const payload: IDPayload = {
      providerId: attachment.contentId!,
      provider: 'smtp-imap',
      identifier: identifier,
      environmentId,
    };
    const id = encrypt(
      JSON.stringify(payload),
      process.env.ID_CREATION_SECRET!,
    );

    return {
      id,
      name: attachment.filename ?? '',
      contentType: attachment.contentType,
      size: attachment.size,
      contentId: attachment.contentId,
    };
  });
  // Threads are harder for SMTP/IMAP, so it will use the message ID as the conversation ID, then we can use the References header to find all related messages
  return {
    id,
    messageId: providerId.value,
    subject: subject,
    from: from,
    sender: sender,
    to: to,
    cc: cc,
    replyTo: replyTo,
    date: message.attributes.date.toISOString(),
    body: bodies,
    thread: {
      conversationId: id,
    },
    attachments,
  };
}
