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
  isInline: boolean;
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
