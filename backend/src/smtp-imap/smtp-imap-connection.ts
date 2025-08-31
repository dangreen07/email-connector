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
  SendEmail,
} from '../utils/types';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

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
): Promise<EmailMessage> {
  console.log(`Provider Code: ${providerId}`);

  const providerJson = JSON.parse(
    decrypt(providerId, process.env.ID_CREATION_SECRET!),
  ) as {
    type: 'uid' | 'message-id';
    value: string;
  };

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

  // Search for the message by Message-ID header
  let searchCriteria: Array<[string, string] | [string, string, string]>;
  const fetchOptions = {
    bodies: [''],
    struct: true,
  };

  if (providerJson.type === 'message-id') {
    searchCriteria = [['HEADER', 'Message-ID', providerJson.value]];
  } else if (providerJson.type === 'uid') {
    // For searching by UID, the imap library typically expects ['UID', 'number']
    searchCriteria = [['UID', providerJson.value]];
  } else {
    // Handle unexpected types, though your 'as' assertion might prevent this at runtime
    throw new Error(`Unsupported provider ID type: ${providerJson.type}`);
  }

  const result = await client
    .search(searchCriteria, fetchOptions)
    .then((value) => value.at(0) ?? null);

  if (!result) {
    throw Error(`No message found with Message-ID ${providerId}`);
  }

  return smtpImapToGeneric(result, identifier, environmentId);
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

  let providerId: {
    type: 'uid' | 'message-id';
    value: string;
  } = {
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

export async function sendSMTPIMAPEmail(
  identifier: string,
  environmentId: string,
  environmentName: string,
  email: SendEmail,
) {
  const connection = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.environmentId, environmentId),
        eq(connections.identifier, identifier),
      ),
    )
    .then((value) => value.at(0) ?? null);

  if (!connection) {
    throw Error('Could not find connection!');
  }

  const rawCredentials = connection.credentials;
  if (!rawCredentials) {
    throw Error('Could not get credentials!');
  }
  const credentials: SMTPIMAPCredentials = JSON.parse(
    decrypt(rawCredentials, process.env.CRED_ENCRYPTION_KEY!),
  );

  const transporter = nodemailer.createTransport({
    host: credentials.smtpServer,
    port: credentials.smtpPort,
    secure: credentials.useSSL,
    auth: {
      user: credentials.email,
      pass: credentials.password,
    },
  });

  const info = await transporter.sendMail({
    from: credentials.email,
    to: email.to.map((t) => t.address).join(', '),
    cc: email.cc?.map((c) => c.address).join(', '),
    bcc: email.bcc?.map((b) => b.address).join(', '),
    subject: email.subject,
    text: email.bodies.find((b) => b.contentType === 'text')?.content,
    html: email.bodies.find((b) => b.contentType === 'html')?.content,
    attachments: email.attachments?.map((a) => ({
      filename: a.fileName,
      content: Buffer.from(a.content, 'base64'),
      contentType: a.mimeType,
    })),
  });

  const payload: IDPayload = {
    providerId: info.messageId,
    provider: 'smtp-imap',
    identifier: identifier,
    environmentId: environmentId,
  };

  const id = encrypt(JSON.stringify(payload), process.env.ID_CREATION_SECRET!);

  return id;
}
