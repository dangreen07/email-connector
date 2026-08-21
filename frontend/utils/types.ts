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
  name: "Free" | "Basic" | "Growth" | "Scale";
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

export type Usage = {
  // Billing period
  periodStart: string;
  periodEnd: string;

  // Plan info
  planName?: string;

  // Inboxes
  inboxesUsed: number;
  inboxesIncluded: number;
  inboxOveragePrice?: number; // USD per inbox

  // API calls
  apiCallsUsed: number; // raw calls this period
  apiCallsIncluded: number; // raw calls included in plan
  apiCallBillingUnit: number; // billing unit (e.g. 100000 for 100k)
  apiOveragePricePer100k?: number; // USD per 100k calls (legacy / alternate)
};