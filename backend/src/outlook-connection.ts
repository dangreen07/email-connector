import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Environment, environments, oauthConnections, stateTokens } from "./db/schema";
import db from "./db";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { createRedisCachePlugin, hydrateTokenCache } from "./redisCachePlugin";

const scopes = ["Mail.Read", "Mail.Send", "offline_access", "openid", "profile", "email", "User.Read"];

function createMsalClient(identifier: string) {
    const msalConfig: Configuration = {
        auth: {
            clientId: process.env.AZURE_CLIENT_ID!,
            authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
            clientSecret: process.env.AZURE_CLIENT_SECRET!,
        },
        cache: {
            cachePlugin: createRedisCachePlugin(identifier),
        },
    }

    return new ConfidentialClientApplication(msalConfig);
}

export async function getOutlookOAuthLink(environment: Environment, identifier: string, redirectAfterAuth: string) {
    if (environment.name !== "development") {
        // TODO: Handle production environment
        return null;
    }

    // Replace with redis later, use a CRON job to clean up old state tokens
    const stateToken = await db.insert(stateTokens).values({
        environmentId: environment.id,
        providerCode: "outlook",
        identifier: identifier,
        redirectAfterAuth: redirectAfterAuth,
    }).returning({ id: stateTokens.id }).then((rows) => rows.at(0) ?? null);

    if (!stateToken) {
        return null;
    }

    const pca = createMsalClient(identifier);

    const authUrl = await pca.getAuthCodeUrl({
        scopes,
        redirectUri: `${process.env.API_URL}/v1/callback/outlook`,
        state: stateToken.id,
    });

    return authUrl;
}

export async function handleOutlookCallback(request: FastifyRequest, response: FastifyReply) {
    const code = (request.query as { code: string }).code;
    const state = (request.query as { state: string }).state;

    if (!code || !state) {
        return response.status(401).send({ error: 'Missing code or state' });
    }

    const stateToken = await db.select().from(stateTokens).where(eq(stateTokens.id, state)).then((rows) => rows.at(0) ?? null);
    if (!stateToken) {
        return response.status(401).send({ error: 'Invalid state token' });
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
        const pca = createMsalClient(stateToken.identifier);

        const tokenResponse = await pca.acquireTokenByCode({
            code: code,
            scopes,
            redirectUri: `${process.env.API_URL}/v1/callback/outlook`,
        });

        // Store the tokens in the database
        await db.insert(oauthConnections).values({
            environmentId: environment.id,
            providerCode: "outlook",
            identifier: stateToken.identifier,
            accessToken: tokenResponse.accessToken,
        })

        return response.redirect(stateToken.redirectAfterAuth);
    }
    catch {
        return response.status(500).send({ error: 'Failed to acquire token' });
    }
}

// Re-acquire an Outlook access token using the MSAL cache persisted in Redis.
// Returns null if no cached account/token is available for the given identifier.
export async function getOutlookAccessToken(identifier: string): Promise<string | null> {
    const pca = createMsalClient(identifier);

    const tokenCache = pca.getTokenCache();
    // Ensure cache is hydrated from Redis for this identifier
    await hydrateTokenCache(identifier, tokenCache);
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
        return result?.accessToken ?? null;
    }
    catch {
        return null;
    }
}