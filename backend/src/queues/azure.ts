import { Queue, Worker } from 'bullmq';
import { getAccessToken } from '../azure/outlook-connection';
import { getGraphClient } from '../azure/GraphAPI';

export const azureSubscriptionRefresh = new Queue('azureSubscriptionRefresh', {
  connection: {
    url: process.env.REDIS_URL!,
  },
});

new Worker(
  'azureSubscriptionRefresh',
  async (job) => {
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

    const notificationUri =
      process.env.NODE_ENV == 'development'
        ? process.env.PROXY_URL
        : process.env.API_URL;

    // Needs to be refreshed every hour to keep alive!
    await graphClient.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl: `${notificationUri}/webhook/outlook/${data.environmentId}`, // must be HTTPS & publicly reachable
      resource: "me/mailFolders('inbox')/messages",
      expirationDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // max 1 hour for mail
      clientState: process.env.AZURE_WEBHOOK_STATE!,
    });

    await azureSubscriptionRefresh.add('refresh', {
      environmentName: data.environmentName,
      environmentId: data.environmentId,
      identifier: data.identifier,
    });
  },
  {
    connection: {
      url: process.env.REDIS_URL!,
    },
  },
);
