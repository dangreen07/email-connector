export interface DashboardProvider {
  credentials?: {
    clientId: string;
    clientSecret: string;
  };
  id: string;
  enabled: boolean;
  environmentId: string;
  providerCode: string;
}
