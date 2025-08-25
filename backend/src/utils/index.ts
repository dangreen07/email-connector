import { EmailAddress, Body } from './types';
import { simpleParser } from 'mailparser';

export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function strToEmailAddress(str: string): EmailAddress {
  const regex = /^(.*?)\s*<([^>]+)>$/;
  const match = str.match(regex);
  if (match) {
    const name = match[1];
    const email = match[2];
    return {
      name,
      address: email,
    };
  }
  return {
    address: str,
  };
}

export async function parseImapBody(body: any): Promise<Body[]> {
  const parsed = await simpleParser(body);
  const bodies: Body[] = [];

  if (parsed.text) {
    bodies.push({
      contentType: 'text',
      content: parsed.text,
    });
  }

  if (parsed.html) {
    bodies.push({
      contentType: 'html',
      content: parsed.html,
    });
  }

  return bodies;
}
