import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Environment, environments, oauthConnections } from "../db/schema";
import db from "../db";
import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { createRedisCachePlugin, hydrateTokenCache } from "../redisCachePlugin";
import redis from "../redis";
import { getGraphClient } from "./GraphAPI";
import { EmailMessage, StoredStateToken } from "../types";
import { encrypt } from "../encryption";

const scopes = ["Mail.Read", "Mail.Send", "offline_access", "openid", "profile", "email", "User.Read"];

function createMsalClient(identifier: string, environmentId: string) {
    const msalConfig: Configuration = {
        auth: {
            clientId: process.env.AZURE_CLIENT_ID!,
            authority: `https://login.microsoftonline.com/common`,
            clientSecret: process.env.AZURE_CLIENT_SECRET!,
        },
        cache: {
            cachePlugin: createRedisCachePlugin(identifier, environmentId),
        },
    }

    return new ConfidentialClientApplication(msalConfig);
}

export async function getOutlookOAuthLink(environment: Environment, identifier: string, redirectAfterAuth: string) {
    if (environment.name !== "development") {
        // TODO: Handle production environment
        return null;
    }

    // Ensure no collision with existing state tokens
    let stateToken = "";
    while (true) {
        stateToken = crypto.randomUUID();

        const result = await redis.set(`outlook-state-token:${stateToken}`, JSON.stringify({
            environmentId: environment.id,
            identifier,
            redirectAfterAuth
        }), {
            expiration: {
                type: "EX",
                value: 2 * 60 * 60 // 2 hours
            },
            condition: "NX"
        });
        if (result === "OK") {
            break;
        }
    }

    const pca = createMsalClient(identifier, environment.id);

    const authUrl = await pca.getAuthCodeUrl({
        scopes,
        redirectUri: `${process.env.API_URL}/v1/callback/outlook`,
        state: stateToken,
    });

    return authUrl;
}

export async function handleOutlookCallback(request: FastifyRequest, response: FastifyReply) {
    const code = (request.query as { code: string }).code;
    const state = (request.query as { state: string }).state;

    if (!code || !state) {
        return response.status(401).send({ error: 'Missing code or state' });
    }

    const stateToken: StoredStateToken | null = await redis.get(`outlook-state-token:${state}`).then((data) => data ? JSON.parse(data) : null);
    if (!stateToken) {
        return response.status(401).send({ error: 'Invalid state token! It may have expired.' });
    }

    const environment = await db.select().from(environments).where(eq(environments.id, stateToken.environmentId)).then((rows) => rows.at(0) ?? null);
    if (!environment) {
        return response.status(401).send({ error: 'Invalid environment' });
    }

    if (environment.name !== "development") {
        // TODO: Handle production environment
        return response.status(401).send({ error: 'Invalid environment' });
    }

    try {
        const pca = createMsalClient(stateToken.identifier, environment.id);

        const tokenResponse = await pca.acquireTokenByCode({
            code: code,
            scopes,
            redirectUri: `${process.env.API_URL}/v1/callback/outlook`,
        });

        await db.insert(oauthConnections).values({
            environmentId: environment.id,
            providerCode: "outlook",
            identifier: stateToken.identifier,
        }).onConflictDoUpdate({
            target: [oauthConnections.environmentId, oauthConnections.providerCode, oauthConnections.identifier],
            set: {
                accessToken: tokenResponse.accessToken,
                updatedAt: new Date(),
            }
        });

        await redis.del(`outlook-state-token:${state}`);

        return response.redirect(stateToken.redirectAfterAuth);
    }
    catch {
        return response.status(500).send({ error: 'Failed to acquire token' });
    }
}

// Re-acquire an Outlook access token using the MSAL cache persisted in Redis.
// Returns null if no cached account/token is available for the given identifier.
async function getOutlookAccessToken(identifier: string, environmentId: string): Promise<string | null> {
    const pca = createMsalClient(identifier, environmentId);

    const tokenCache = pca.getTokenCache();
    // Ensure cache is hydrated from Redis for this identifier
    await hydrateTokenCache(identifier, environmentId, tokenCache);
    const accounts = await tokenCache.getAllAccounts();

    if (!accounts || accounts.length === 0) {
        return null;
    }

    const primaryAccount = accounts[0];

    try {
        const result = await pca.acquireTokenSilent({
            scopes,
            account: primaryAccount,
        });
        return result.accessToken;
    }
    catch {
        return null;
    }
}

export async function getOutlookMessages(identifier: string, environmentId: string, limit: number = 10) {
    const accessToken = await getOutlookAccessToken(identifier, environmentId);
    if (!accessToken) {
        throw new Error("No Outlook access token available. Connect Outlook first.");
    }

    const graphClient = getGraphClient(accessToken);

    try {
        const response = await graphClient
            .api("/me/messages")
            .top(Math.min(Math.max(limit, 1), 50))
            .orderby("receivedDateTime desc")
            .select("id,internetMessageId,subject,from,sender,toRecipients,ccRecipients,bccRecipients,replyTo,sentDateTime,body,conversationId")
            .get();

        return (response?.value ?? []).map((outlookMsg: any) => outlookToGeneric(outlookMsg, identifier, environmentId));
    }
    catch (error) {
        // Surface Graph errors to the caller for better diagnostics
        throw error;
    }
}
export async function getOutlookMessageById(identifier: string, environmentId: string, providerId: string) {
    const accessToken = await getOutlookAccessToken(identifier, environmentId);
    if (!accessToken) {
        const err: any = new Error("No Outlook access token available. Connect Outlook first.");
        err.statusCode = 401;
        throw err;
    }

    const graphClient = getGraphClient(accessToken);

    try {
        const outlookMsg = await graphClient
            .api(`/me/messages/${providerId}`)
            .select("id,internetMessageId,subject,from,sender,toRecipients,ccRecipients,bccRecipients,replyTo,sentDateTime,body,conversationId")
            .get();

        return outlookToGeneric(outlookMsg, identifier, environmentId);
    }
    catch (error) {
        // Surface Graph errors to the caller for better diagnostics
        throw error;
    }
}

function outlookToGeneric(outlookMsg: any, identifier: string, environmentId: string): EmailMessage {
    const payload = {
        providerId: outlookMsg.id,
        provider: "outlook",
        identifier,
        environmentId,
    };
    const id = encrypt(JSON.stringify(payload), process.env.ID_CREATION_SECRET!);

    const conversationPayload = {
        providerId: outlookMsg.conversationId,
        provider: "outlook",
        identifier,
        environmentId,
    };
    const conversationId = encrypt(JSON.stringify(conversationPayload), process.env.ID_CREATION_SECRET!);

    return {
        id,
        messageId: outlookMsg.internetMessageId,
        subject: outlookMsg.subject,
        from: outlookMsg.from?.emailAddress,
        sender: outlookMsg.sender?.emailAddress,
        to: outlookMsg.toRecipients?.map((r: any) => r.emailAddress) || [],
        cc: outlookMsg.ccRecipients?.map((r: any) => r.emailAddress) || [],
        replyTo: outlookMsg.replyTo?.map((r: any) => r.emailAddress) || [],
        date: outlookMsg.sentDateTime,
        body: [{
            contentType: outlookMsg.body?.contentType?.toLowerCase() === "html" ? "html" : "text",
            content: outlookMsg.body?.content || "",
        }],
        thread: {
            conversationId,
            // conversationIndex is Outlook-specific, not RFC standard
        },
    };
}