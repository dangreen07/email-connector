export type DashboardProvider =
  | {
      credentials?: {
        clientId: string;
        clientSecret: string;
      };
      id: string;
      enabled: boolean;
      environmentId: string;
      providerCode: "outlook";
    }
  | {
      id: string;
      enabled: boolean;
      environmentId: string;
      providerCode: "smtp-imap";
    }
  | {
      id: string;
      enabled: boolean;
      environmentId: string;
      providerCode: "gmail";
      credentials?: {
        clientId: string;
        clientSecret: string;
        topicName: string;
      };
    };
