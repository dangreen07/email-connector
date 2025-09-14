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

export type Tier = {
  name: "Basic" | "Growth" | "Scale";
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};
