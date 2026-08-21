import { z } from "zod";

const EmailAddressSchema = z.object({
  name: z.string().nullish(),
  address: z.string()
});

const RecipientSchema = z
  .union([
    z.string(),
    EmailAddressSchema,
    z.object({
      name: z.string().nullish(),
      email: z.string()
    })
  ])
  .transform((val): EmailAddress => {
    if (typeof val === "string") {
      return { address: val };
    }
    if ("email" in val) {
      return { name: val.name ?? undefined, address: val.email };
    }
    return { name: val.name ?? undefined, address: val.address };
  });

const BodySchema = z.object({
  contentType: z.enum(["text", "html"]),
  content: z.string()
})

export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type Body = z.infer<typeof BodySchema>;

export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface EmailMessage {
  id?: string; // Produced from AES‑256‑GCM(providerId + provider + identifier + environmentId, secretKey)
  messageId?: string; // RFC 5322 Message-ID
  subject?: string;
  from?: EmailAddress[];
  sender?: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  replyTo: EmailAddress[];
  date?: string; // ISO 8601
  body?: Body[];
  attachments?: Attachment[];
  headers?: Record<string, string>; // raw headers if available
  thread?: {
    conversationId?: string;
    inReplyTo?: string;
    references?: string[];
  };
}

export interface StoredStateToken {
  environmentId: string;
  identifier: string;
  redirectAfterAuth: string;
}

export interface SMTPIMAPCredentials {
  smtpServer: string;
  smtpPort: number;
  imapServer: string;
  imapPort: number;
  email: string;
  password: string;
  useSSL: boolean;
}

export interface IDPayload {
  providerId: string;
  provider: string;
  identifier: string;
  environmentId: string;
  // Identifies which connection a message belongs to when an identifier has
  // multiple connections for the same provider (e.g. several SMTP/IMAP
  // accounts). Optional so previously issued ids keep decrypting.
  email?: string;
}

export const SendEmailSchema = z.object({
  to: z.array(RecipientSchema),
  cc: z.array(RecipientSchema).nullish(),
  bcc: z.array(RecipientSchema).nullish(),
  subject: z.string(),
  bodies: z.array(BodySchema),
  attachments: z.array(z.object({
    fileName: z.string(),
    mimeType: z.string(),
    content: z.string()
  })).nullish(),
  thread: z.object({
    conversationId: z.string().nullable(),
    inReplyTo: z.string().nullable(),
    references: z.string().nullable()
  }).nullish()
});

export type SendEmail = z.infer<typeof SendEmailSchema>;

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  topicName: string;
}

export interface GraphUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
}

export type Usage = {
  // Billing period
  periodStart: string;
  periodEnd: string;

  // Plan info
  planName?: string;

  // Inboxes
  inboxesUsed: number;
  inboxesIncluded: number;
  inboxOveragePrice?: number; // USD per inbox

  // API calls
  apiCallsUsed: number; // raw calls this period
  apiCallsIncluded: number; // raw calls included in plan
  apiCallBillingUnit: number; // billing unit (e.g. 100000 for 100k)
  apiOveragePricePer100k?: number; // USD per 100k calls (legacy / alternate)
};
