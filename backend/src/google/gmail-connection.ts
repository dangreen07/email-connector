import { FastifyReply, FastifyRequest } from 'fastify';
import { Environment, environments, connections } from '../db/schema';
import redis from '../redis';
import { EmailAddress, EmailMessage, StoredStateToken } from '../types';
import db from '../db';
import { and, eq, sql } from 'drizzle-orm';
import { gmail_v1, google } from 'googleapis';
import { encrypt } from '../encryption';

export async function getGmailOauthLink(
  environment: Environment,
  identifier: string,
  redirectAfterAuth: string,
) {
  if (environment.name !== 'development') {
    // TODO: Handle production environment
    return null;
  }

  // Ensure no collision with existing state tokens
  let stateToken = '';
  while (true) {
    stateToken = crypto.randomUUID();

    const result = await redis.set(
      `gmail-state-token:${stateToken}`,
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

  const client = new google.auth.OAuth2({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uris: [`${process.env.API_URL}/v1/callback/gmail`],
  });

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    state: stateToken,
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
    response_type: 'code',
    prompt: 'consent',
  });

  return authUrl;
}

export async function handleGmailCallback(
  request: FastifyRequest,
  response: FastifyReply,
) {
  const code = (request.query as { code: string }).code;
  const state = (request.query as { state: string }).state;

  if (!code || !state) {
    return response.status(401).send({ error: 'Missing code or state' });
  }

  const stateToken: StoredStateToken | null = await redis
    .get(`gmail-state-token:${state}`)
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

  if (environment.name !== 'development') {
    // TODO: Handle production environment
    return response.status(401).send({ error: 'Invalid environment' });
  }

  const client = new google.auth.OAuth2({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uris: [`${process.env.API_URL}/v1/callback/gmail`],
  });

  const tokenResponse = await client.getToken(code);

  await db
    .insert(connections)
    .values({
      environmentId: environment.id,
      providerCode: 'gmail',
      identifier: stateToken.identifier,
      accessToken: tokenResponse.tokens.access_token,
      refreshToken: tokenResponse.tokens.refresh_token,
      expiresAt: new Date(tokenResponse.tokens.expiry_date ?? 0),
    })
    .onConflictDoUpdate({
      target: [
        connections.environmentId,
        connections.providerCode,
        connections.identifier,
      ],
      set: {
        accessToken: tokenResponse.tokens.access_token,
        refreshToken: sql`COALESCE(EXCLUDED.refresh_token, ${tokenResponse.tokens.refresh_token})`,
        expiresAt: new Date(tokenResponse.tokens.expiry_date ?? 0),
      },
    });

  await redis.del(`gmail-state-token:${state}`);

  return response.redirect(stateToken.redirectAfterAuth);
}

export async function getGmailMessages(
  identifier: string,
  environmentId: string,
  limit: number = 10,
) {
  const oauthConnection = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.environmentId, environmentId),
        eq(connections.providerCode, 'gmail'),
        eq(connections.identifier, identifier),
      ),
    )
    .then((rows) => rows.at(0) ?? null);

  if (!oauthConnection) {
    throw new Error('No Gmail OAuth connection found. Connect Gmail first.');
  }

  const client = new google.auth.OAuth2({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uris: [`${process.env.API_URL}/v1/callback/gmail`],
  });

  client.setCredentials({
    access_token: oauthConnection.accessToken,
    refresh_token: oauthConnection.refreshToken,
    expiry_date: oauthConnection.expiresAt?.getTime(),
  });

  const gmail = google.gmail({ version: 'v1', auth: client });

  const messageIds = await gmail.users.messages
    .list({
      userId: 'me',
      maxResults: limit,
    })
    .then((res) => res.data.messages ?? []);

  const messages = await Promise.all(
    messageIds.map((message) => {
      return gmail.users.messages
        .get({
          userId: 'me',
          id: message.id ?? '',
        })
        .then((res) => res.data);
    }),
  );

  return messages.map((msg) => gmailToGeneric(msg, identifier, environmentId));
}
export async function getGmailMessageById(
  identifier: string,
  environmentId: string,
  providerId: string,
) {
  const oauthConnection = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.environmentId, environmentId),
        eq(connections.providerCode, 'gmail'),
        eq(connections.identifier, identifier),
      ),
    )
    .then((rows) => rows.at(0) ?? null);

  if (!oauthConnection) {
    const err: any = new Error(
      'No Gmail OAuth connection found. Connect Gmail first.',
    );
    err.statusCode = 401;
    throw err;
  }

  const client = new google.auth.OAuth2({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uris: [`${process.env.API_URL}/v1/callback/gmail`],
  });

  client.setCredentials({
    access_token: oauthConnection.accessToken ?? undefined,
    refresh_token: oauthConnection.refreshToken ?? undefined,
    expiry_date: oauthConnection.expiresAt?.getTime(),
  });

  const gmail = google.gmail({ version: 'v1', auth: client });

  const msg = await gmail.users.messages
    .get({
      userId: 'me',
      id: providerId,
    })
    .then((res) => res.data);

  return gmailToGeneric(msg, identifier, environmentId);
}

function getHeaderValue(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string,
) {
  return headers.find((header) => header.name === name)?.value;
}

function strToEmailAddress(str: string): EmailAddress {
  const regex = /^(.*?)\s*<([^>]+)>$/;
  const match = str.match(regex);
  if (match) {
    const name = match[1];
    const email = match[2];
    return {
      name,
      address: email,
    };
  }
  return {
    address: str,
  };
}

const base64Decode = (input: string): string => {
  return Buffer.from(input, 'base64').toString('utf-8');
};

const getBody = (
  part: gmail_v1.Schema$MessagePart,
):
  | { contentType: 'text' | 'html'; content: string }
  | { contentType: 'text' | 'html'; content: string }[]
  | null => {
  if (part.mimeType === 'text/plain') {
    return {
      contentType: 'text' as const,
      content: base64Decode(part.body?.data ?? ''),
    };
  } else if (part.mimeType === 'text/html') {
    return {
      contentType: 'html' as const,
      content: base64Decode(part.body?.data ?? ''),
    };
  } else if (part.mimeType === 'multipart/alternative') {
    return (
      part.parts
        ?.map(getBody)
        .flat()
        .filter((part) => part !== null) ?? []
    );
  } else if (part.body?.data !== undefined && part.body?.data !== null) {
    return {
      contentType: 'text' as const,
      content: base64Decode(part.body?.data ?? ''),
    };
  }
  return null;
};

function gmailToGeneric(
  gmailMsg: gmail_v1.Schema$Message,
  identifier: string,
  environmentId: string,
): EmailMessage {
  const payload = {
    providerId: gmailMsg.id,
    provider: 'gmail',
    identifier,
    environmentId,
  };
  const id = encrypt(JSON.stringify(payload), process.env.ID_CREATION_SECRET!);

  const headers = gmailMsg.payload?.headers ?? [];
  const messageId = getHeaderValue(headers, 'Message-ID') ?? '';
  const subject = getHeaderValue(headers, 'Subject') ?? '';
  const from = strToEmailAddress(getHeaderValue(headers, 'From') ?? '');
  const senderStr = getHeaderValue(headers, 'Sender');
  let sender: EmailAddress;
  if (senderStr) {
    sender = strToEmailAddress(senderStr);
  } else {
    sender = from;
  }
  const to =
    getHeaderValue(headers, 'To')?.split(',').map(strToEmailAddress) ?? [];
  const cc =
    getHeaderValue(headers, 'Cc')?.split(',').map(strToEmailAddress) ?? [];
  const replyTo =
    getHeaderValue(headers, 'Reply-To')?.split(',').map(strToEmailAddress) ??
    [];
  const date = getHeaderValue(headers, 'Date') ?? undefined;
  const references =
    getHeaderValue(headers, 'References')?.split(' ') ?? undefined;
  const body =
    gmailMsg.payload?.parts
      ?.map(getBody)
      .flat()
      .filter((part) => part !== null) ?? [];

  const attachments =
    gmailMsg.payload?.parts
      ?.filter(
        (part) =>
          part.filename !== undefined && part.body?.attachmentId !== undefined,
      )
      .map((part) => {
        const attachmentPayload = {
          providerId: part.body?.attachmentId ?? '',
          provider: 'gmail',
          identifier,
          environmentId,
        };
        const attachmentId = encrypt(
          JSON.stringify(attachmentPayload),
          process.env.ID_CREATION_SECRET!,
        );

        return {
          id: attachmentId,
          name: part.filename ?? '',
          contentType: part.mimeType ?? '',
          size: part.body?.size ?? 0,
          isInline: false,
        };
      }) ?? [];

  const conversationPayload = {
    providerId: gmailMsg.threadId,
    provider: 'gmail',
    identifier,
    environmentId,
  };
  const conversationId = encrypt(
    JSON.stringify(conversationPayload),
    process.env.ID_CREATION_SECRET!,
  );

  const thread = {
    conversationId,
    inReplyTo: getHeaderValue(headers, 'In-Reply-To') ?? undefined,
    references: references ?? undefined,
  };

  return {
    id,
    messageId,
    subject,
    from,
    sender,
    to,
    cc,
    replyTo,
    date,
    body,
    attachments,
    thread,
  };
}
