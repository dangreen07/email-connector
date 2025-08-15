import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    userId: text("user_id").notNull()
});

export const environments = pgTable("environments", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    publishableKey: text("publishable_key").notNull(),
    secretKey: text("secret_key").notNull()
});

// List of providers that can be connected to an environment
export const providers = pgTable("providers", {
    code: text("code").notNull().primaryKey(), // e.g. "gmail", "outlook", "smtp-imap"
    name: text("name").notNull(),
});

export const connectedProviders = pgTable("connected_providers", {
    id: uuid("id").primaryKey().defaultRandom(),
    environmentId: uuid("environment_id").notNull().references(() => environments.id),
    providerCode: text("provider_code").notNull().references(() => providers.code),
    // Encrypted with AES-256-GCM of JSONified data.
    credentials: text("credentials")
});

export const subscriptions = pgTable("subscriptions", {
    id: text("id").primaryKey(),
    currency: text("currency").notNull(),
    customerId: text("customer_id").notNull().references(() => users.stripeCustomerId),
    type: text("type").notNull().default("global"), // Could be useful in-case we want to switch to a per-project plan
    status: text("status").notNull(),
    createdAt: timestamp("created_at").notNull()
});

export const users = pgTable("users", {
    clerkUserId: text("clerk_user_id").primaryKey(),
    stripeCustomerId: text("stripe_customer_id").unique()
});

export type Project = typeof projects.$inferSelect;
export type Environment = typeof environments.$inferSelect;

export interface FullProject extends Project {
    environments: Environment[];
}