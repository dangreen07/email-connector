import { Job } from 'bullmq';
import { logs } from '../db/schema';
import db from '../db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logJob = async (job: Job<any, any, string>) => {
  const data = job.data as {
    environmentId: string;
    route: string;
    method: string;
    statusCode: number;
    time: Date;
    duration: number;
    query: unknown;
    body: unknown;
  };

  await db.insert(logs).values({
    ...data,
    requestAt: data.time,
    query: data.query as string,
    body: data.body as string,
  });
};
