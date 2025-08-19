export interface EmailAddress {
    name?: string;
    address: string;
}

export interface EmailMessage {
    id?: string; // Produced from AES‑256‑GCM(providerId + provider + identifier + environmentId, secretKey)
    messageId?: string; // RFC 5322 Message-ID
    subject?: string;
    from?: EmailAddress;
    sender?: EmailAddress;
    to: EmailAddress[];
    cc: EmailAddress[];
    replyTo: EmailAddress[];
    date?: string; // ISO 8601
    body?: {
        contentType: "text" | "html";
        content: string;
    }[];
    attachments?: {
        id: string;
        name: string;
        contentType: string;
        size: number;
        isInline: boolean;
        contentId?: string;
    }[];
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