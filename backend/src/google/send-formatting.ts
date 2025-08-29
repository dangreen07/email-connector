import crypto from 'crypto';

function formatAddress(a: { name?: string; address: string }) {
  if (!a.name) return a.address;
  // Quote name if it contains special chars; simple fallback
  const safeName =
    /[^\w\s.-]/.test(a.name) || /,/.test(a.name) ? `"${a.name}"` : a.name;
  return `${safeName} <${a.address}>`;
}

function joinAddresses(addrs?: { name?: string; address: string }[]) {
  if (!addrs || addrs.length === 0) return '';
  return addrs.map(formatAddress).join(', ');
}

function encodeSubject(subject: string) {
  // Always encode as base64 UTF-8 word (safe)
  const b64 = Buffer.from(subject || '', 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

function chunkString(str: string, size = 76) {
  const re = new RegExp(`.{1,${size}}`, 'g');
  return (str.match(re) || []).join('\r\n');
}

function base64UrlEncode(b64: string) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildRawEmail(
  email: {
    to: { name?: string; address: string }[];
    cc?: { name?: string; address: string }[];
    bcc?: { name?: string; address: string }[];
    subject: string;
    bodies: { contentType: 'text' | 'html'; content: string }[];
    attachments?: { fileName: string; mimeType: string; content: string }[];
    thread?: {
      conversationId?: string;
      inReplyTo?: string;
      references?: string;
    };
  },
  from: { name?: string; address: string } | string,
) {
  const CRLF = '\r\n';

  const fromHeader = typeof from === 'string' ? from : formatAddress(from);

  const toHeader = joinAddresses(email.to);
  const ccHeader = joinAddresses(email.cc);
  const bccHeader = joinAddresses(email.bcc);

  const subjectHeader = encodeSubject(email.subject || '');

  // Message-ID (simple random),
  const messageId = `<${crypto.randomBytes(12).toString('hex')}@${
    typeof from === 'string'
      ? from.split('@')[1] || 'local'
      : from.address.split('@')[1] || 'local'
  }>`;

  const dateHeader = new Date().toUTCString();

  const plain = email.bodies.find((b) => b.contentType === 'text')?.content;
  const html = email.bodies.find((b) => b.contentType === 'html')?.content;
  const hasAttachments = (email.attachments || []).length > 0;

  // Helper boundaries
  const altBoundary = `alt_${crypto.randomBytes(8).toString('hex')}`;
  const mixedBoundary = `mixed_${crypto.randomBytes(8).toString('hex')}`;

  // Build headers
  let headers = '';
  headers += `From: ${fromHeader}${CRLF}`;
  if (toHeader) headers += `To: ${toHeader}${CRLF}`;
  if (ccHeader) headers += `Cc: ${ccHeader}${CRLF}`;
  if (bccHeader) headers += `Bcc: ${bccHeader}${CRLF}`;
  headers += `Subject: ${subjectHeader}${CRLF}`;
  headers += `Message-ID: ${messageId}${CRLF}`;
  headers += `Date: ${dateHeader}${CRLF}`;
  headers += `MIME-Version: 1.0${CRLF}`;

  // Build body
  let body = '';

  if (hasAttachments) {
    headers += `Content-Type: multipart/mixed; boundary="${mixedBoundary}"${CRLF}${CRLF}`;
    body += `--${mixedBoundary}${CRLF}`;

    // Add either single body or multipart/alternative inside mixed
    if (plain && html) {
      body += `Content-Type: multipart/alternative; boundary="${altBoundary}"${CRLF}${CRLF}`;
      body += `--${altBoundary}${CRLF}`;
      body += `Content-Type: text/plain; charset="UTF-8"${CRLF}`;
      body += `Content-Transfer-Encoding: 7bit${CRLF}${CRLF}`;
      body += `${plain}${CRLF}${CRLF}`;
      body += `--${altBoundary}${CRLF}`;
      body += `Content-Type: text/html; charset="UTF-8"${CRLF}`;
      body += `Content-Transfer-Encoding: 7bit${CRLF}${CRLF}`;
      body += `${html}${CRLF}${CRLF}`;
      body += `--${altBoundary}--${CRLF}${CRLF}`;
    } else if (html) {
      body += `Content-Type: text/html; charset="UTF-8"${CRLF}`;
      body += `Content-Transfer-Encoding: 7bit${CRLF}${CRLF}`;
      body += `${html}${CRLF}${CRLF}`;
    } else {
      body += `Content-Type: text/plain; charset="UTF-8"${CRLF}`;
      body += `Content-Transfer-Encoding: 7bit${CRLF}${CRLF}`;
      body += `${plain || ''}${CRLF}${CRLF}`;
    }

    // Attachments
    for (const att of email.attachments || []) {
      body += `--${mixedBoundary}${CRLF}`;
      body += `Content-Type: ${att.mimeType}; name="${att.fileName}"${CRLF}`;
      body += `Content-Transfer-Encoding: base64${CRLF}`;
      body += `Content-Disposition: attachment; filename="${att.fileName}"${CRLF}${CRLF}`;
      // att.content is expected as base64 string
      body += `${chunkString(att.content)}${CRLF}${CRLF}`;
    }

    body += `--${mixedBoundary}--${CRLF}`;
  } else {
    // No attachments
    if (plain && html) {
      headers += `Content-Type: multipart/alternative; boundary="${altBoundary}"${CRLF}${CRLF}`;
      body += `--${altBoundary}${CRLF}`;
      body += `Content-Type: text/plain; charset="UTF-8"${CRLF}`;
      body += `Content-Transfer-Encoding: 7bit${CRLF}${CRLF}`;
      body += `${plain}${CRLF}${CRLF}`;
      body += `--${altBoundary}${CRLF}`;
      body += `Content-Type: text/html; charset="UTF-8"${CRLF}`;
      body += `Content-Transfer-Encoding: 7bit${CRLF}${CRLF}`;
      body += `${html}${CRLF}${CRLF}`;
      body += `--${altBoundary}--${CRLF}`;
    } else if (html) {
      headers += `Content-Type: text/html; charset="UTF-8"${CRLF}${CRLF}`;
      body += `${html}${CRLF}`;
    } else {
      headers += `Content-Type: text/plain; charset="UTF-8"${CRLF}${CRLF}`;
      body += `${plain || ''}${CRLF}`;
    }
  }

  const raw = headers + body;

  // Gmail wants base64url encoded raw message
  const b64 = Buffer.from(raw, 'utf8').toString('base64');
  return base64UrlEncode(b64);
}
