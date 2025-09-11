import db from '../db';
import { logs } from '../db/schema';
import { encrypt } from '../encryption';

type InsertLogParams = {
  environmentId: string;
  route: string;
  method: string;
  status: string;
  httpStatus?: number;
  durationMs?: number;
  payloadObject: unknown;
};

export async function insertLog(params: InsertLogParams) {
  const {
    environmentId,
    route,
    method,
    status,
    httpStatus,
    durationMs,
    payloadObject,
  } = params;

  // Prepare payload JSON
  let payloadString: string;
  try {
    payloadString = JSON.stringify(payloadObject);
  } catch (err) {
    payloadString = `__serialization_error__: ${String(err)}`;
  }

  const encryptionKey = process.env.LOGS_ENCRYPTION_KEY;
  let storedPayload = payloadString;

  if (encryptionKey) {
    try {
      storedPayload = encrypt(payloadString, encryptionKey);
    } catch (err) {
      // If encryption fails, fall back to storing plaintext but log the error
      // Do not throw — logging should be non-blocking and resilient
      console.error('Failed to encrypt log payload, storing plaintext', err);
      storedPayload = payloadString;
    }
  } else {
    console.warn('LOGS_ENCRYPTION_KEY not set — storing logs in plaintext');
  }

  // Insert into DB. Caller can choose to await or fire-and-forget.
  try {
    await db.insert(logs).values({
      environmentId,
      route,
      method,
      status,
      httpStatus,
      durationMs,
      payload: storedPayload,
    });
  } catch (err) {
    console.error('Failed to insert log into DB', err);
    throw err;
  }
}
