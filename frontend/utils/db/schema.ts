import { doublePrecision } from "drizzle-orm/pg-core";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const environmentNameEnum = pgEnum("names", [
  "development",
  "production",
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("user_id").notNull(),
});

export const environments = pgTable("environments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: environmentNameEnum("name").notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  publishableKey: text("publishable_key").notNull().unique(),
  secretKey: text("secret_key").notNull().unique(),
});

// List of providers that can be connected to an environment
export const providers = pgTable("providers", {
  code: text("code").notNull().primaryKey(), // e.g. "gmail", "outlook", "smtp-imap"
  name: text("name").notNull(),
});

export const connectedProviders = pgTable("connected_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  enabled: boolean("enabled").notNull().default(false),
  environmentId: uuid("environment_id")
    .notNull()
    .references(() => environments.id),
  providerCode: text("provider_code")
    .notNull()
    .references(() => providers.code),
  // Encrypted with AES-256-GCM of JSONified data.
  credentials: text("credentials"),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => users.stripeCustomerId)
    .unique(),
  type: text("type").notNull().default("global"), // Could be useful in-case we want to switch to a per-project plan
  productId: text("productId"),
  status: text("status").notNull(),
  billingCycleAnchor: timestamp("billing_cycle_anchor").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
});

export const users = pgTable("users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").unique().notNull(),
});

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environments.id),
    identifier: text("identifier").notNull(),
    connectionCredentials: uuid("connection_credentials_id")
      .references(() => connectionCredentials.id)
      .notNull(),
  },
  (table) => [
    uniqueIndex("unique_identifier").on(
      table.environmentId,
      table.identifier,
      table.connectionCredentials
    ),
  ]
);

export const connectionCredentials = pgTable("connection_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerCode: text("provider_code")
    .notNull()
    .references(() => providers.code),
  email: text("email").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  credentials: text("credentials"), // Encrypted with AES-256-GCM of JSONified data.
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  refreshJobId: text("refresh_job_id"),
  lastRefresh: timestamp("last_refresh"),
});

export const webhooks = pgTable("webhook", {
  id: uuid("id").primaryKey().defaultRandom(),
  environmentId: uuid("environment_id")
    .notNull()
    .references(() => environments.id),
  name: text("name").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  active: boolean("active").notNull(),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  environmentId: uuid("environment_id")
    .notNull()
    .references(() => environments.id),
  route: text("route").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  requestAt: timestamp("requestAt").notNull(),
  duration: doublePrecision("duration").notNull(),
  query: text("query"),
  body: text("body"),
});

export type Project = typeof projects.$inferSelect;
export type Environment = typeof environments.$inferSelect;
export type ConnectedProvider = typeof connectedProviders.$inferSelect;
export type ConnectionCredentials = typeof connectionCredentials.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;
export type Log = typeof logs.$inferSelect;

export interface FullProject extends Project {
  environments: Environment[];
}
