export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Body {
  contentType: 'text' | 'html';
  content: string;
}

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
}

export interface SendEmail {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodies: Body[];
  attachments?: { fileName: string; mimeType: string; content: string }[];
  thread?: {
    conversationId?: string;
    inReplyTo?: string;
    references?: string;
  };
}

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
