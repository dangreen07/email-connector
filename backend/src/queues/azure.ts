import { getAccessToken } from '../azure/outlook-connection';
import { getGraphClient } from '../azure/GraphAPI';
import { queue } from '.';
import { Job } from 'bullmq';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const azureSubRefresh = async (job: Job<any, any, string>) => {
  const data = job.data as {
    environmentName: string;
    environmentId: string;
    identifier: string;
  };
  const accessToken = await getAccessToken(
    data.environmentName,
    data.environmentId,
    data.identifier,
  );
  const graphClient = getGraphClient(accessToken);

  const notificationUri = process.env.PROXY_URL!;

  // Needs to be refreshed every hour to keep alive!
  await graphClient.api('/subscriptions').post({
    changeType: 'created',
    notificationUrl: `${notificationUri}/webhook/outlook/${data.environmentId}`, // must be HTTPS & publicly reachable
    resource: "me/mailFolders('inbox')/messages",
    expirationDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // max 1 hour for mail
    clientState: process.env.AZURE_WEBHOOK_STATE!,
  });

  await queue.add(
    'azure-sub-refresh',
    {
      environmentName: data.environmentName,
      environmentId: data.environmentId,
      identifier: data.identifier,
    },
    {
      delay: 50 * 60 * 1000, // Refresh every 50 minutes
    },
  );
};
