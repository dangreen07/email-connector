"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * QuickStartGuide
 *
 * Renders a Markdown quick start guide as prose styled with Tailwind's `prose` utilities.
 * The markdown is the single source of truth (no mixed HTML/JSX inside content).
 */
export default function QuickStartGuide() {
  const md = `
## Overview

MailLink provides a unified API to connect user inboxes (Gmail, Outlook, or SMTP/IMAP) and to send & list messages on behalf of those accounts. This guide covers:

1. Obtaining keys
2. Connecting a provider (OAuth or SMTP)
3. Sending an email via the API
4. Listing and retrieving messages

---

## 1) Get your keys

- **Publishable Key**: used from client code to initiate OAuth/connect flows.
- **Secret Key**: server-side only. Required to list messages and to send emails.

You can view and manage keys from the project dashboard.

---

## 2) Connect a provider

To start an OAuth connection (Gmail / Outlook) call the \`POST /v1/connection\` endpoint with your **Publishable Key** in the Authorization header. For SMTP/IMAP provide credentials in the request body.

Example (curl OAuth):

\`\`\`bash
curl -X POST "https://api.maillink.co/v1/connection?providerCode=gmail&identifier=user-123&redirectAfterAuth=https%3A%2F%2Fyourapp.com%2Foauth-callback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pk_xxx"
\`\`\`

The OAuth response will contain an \`authUrl\` you should redirect the user to:

\`\`\`json
{ "authUrl": "https://accounts.google.com/o/oauth2/..." }
\`\`\`

SMTP/IMAP example (curl provide credentials in body):

\`\`\`bash
curl -X POST "https://api.maillink.co/v1/connection?providerCode=smtp-imap&identifier=user-123&redirectAfterAuth=unused" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pk_xxx" \
  -d '{"smtpServer":"smtp.example.com","smtpPort":465,"imapServer":"imap.example.com","imapPort":993,"email":"me@example.com","password":"supersecret","useSSL":true}'
\`\`\`

---

## 3) Send an email

Use your **Secret Key** from server-side code to call \`POST /v1/messages\`. Include \`identifier\` and \`providerCode\` as query parameters.

Minimal curl example:

\`\`\`bash
curl -X POST "https://api.maillink.co/v1/messages?identifier=user-123&providerCode=gmail" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_xxx" \
  -d '{
    "to": [{"address":"recipient@example.com"}],
    "subject": "Hello from MailLink",
    "bodies": [{"contentType":"text","content":"Plain text body"}]
  }'
\`\`\`

Node (fetch) example:

\`\`\`js
const res = await fetch('https://api.maillink.co/v1/messages?identifier=user-123&providerCode=gmail', {
  method: 'POST',
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_xxx"
  },
  body: JSON.stringify({
    to: [{ address: "recipient@example.com" }],
    subject: "Hello from MailLink",
    bodies: [{ contentType: "text", content: "Plain text body" }]
  })
});
const data = await res.json(); // { emailId: "..." }
\`\`\`

---

## 4) List & retrieve messages

- List messages: \`GET /v1/messages?identifier=<identifier>&providerCode=<provider>\` (use Secret Key)  
- Get message details: \`GET /v1/messages/by-id?id=<apiMessageId>\` (use Secret Key)

Example (curl list):

\`\`\`bash
curl "https://api.maillink.co/v1/messages?identifier=user-123&providerCode=gmail" \
  -H "Authorization: Bearer sk_xxx"
\`\`\`

---

## References & tips

- API docs: [Docs](/docs)  
- Use publishable keys only from client code for initiating connections.  
- Keep Secret Keys strictly server-side. They allow sending/listing messages.  
- If you need example payloads, see the API docs or the example JSON in the dashboard.
`;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Quick Start Guide</CardTitle>
        <CardDescription>
          Follow these steps to get started with your project.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </article>
      </CardContent>
    </Card>
  );
}
