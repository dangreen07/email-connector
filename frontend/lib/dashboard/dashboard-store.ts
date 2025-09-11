import { Webhook } from "@/utils/db/schema";
import { createStore } from "zustand/vanilla";

export type DashboardState = {
  projectName: string;
  environmentName: string;

  projectId: string;
  environmentId: string;

  publishableKey: string;
  secretKey: string;

  outlookEnabled: boolean;
  outlookClientId: string;
  outlookClientSecret: string;

  gmailEnabled: boolean;
  gmailClientId: string;
  gmailClientSecret: string;
  gmailTopicName: string;

  webhooks: Webhook[];

  imapEnabled: boolean;
  currentTab: "overview" | "providers" | "webhooks" | "settings";

  changed: boolean;
};

export type DashboardActions = {
  changeEnvironmentOrProject: (
    projectName: string,
    environmentName: string,
    projectId: string,
    environmentId: string,
    publishableKey: string,
    secretKey: string,
    outlookEnabled: boolean,
    gmailEnabled: boolean,
    imapEnabled: boolean,
    webhooks: Webhook[],
    gmailCredentials?: {
      clientId: string;
      clientSecret: string;
      topicName: string;
    },
    outlookCredentials?: {
      clientId: string;
      clientSecret: string;
    }
  ) => void;
  setProjectName: (projectName: string) => void;
  setEnvironmentName: (environmentName: string) => void;

  setProjectId: (projectId: string) => void;
  setEnvironmentId: (environmentId: string) => void;

  setPublishableKey: (publishableKey: string) => void;
  setSecretKey: (secretKey: string) => void;
  setOutlookEnabled: (outlookEnabled: boolean) => void;
  setGmailEnabled: (gmailEnabled: boolean) => void;
  setImapEnabled: (imapEnabled: boolean) => void;
  setCurrentTab: (
    currentTab: "overview" | "providers" | "webhooks" | "settings"
  ) => void;
  setChanged: (changed: boolean) => void;

  setGmailClientId: (clientId: string) => void;
  setGmailClientSecret: (clientSecret: string) => void;
  setGmailTopicName: (topicName: string) => void;

  setOutlookClientId: (clientId: string) => void;
  setOutlookClientSecret: (clientSecret: string) => void;

  setWebhooks: (webhooks: Webhook[]) => void;
};

export type DashboardStore = DashboardState & DashboardActions;

export const initDashboardStore = (): DashboardState => {
  return {
    projectName: "",
    environmentName: "",

    projectId: "",
    environmentId: "",

    publishableKey: "",
    secretKey: "",
    outlookEnabled: false,
    outlookClientId: "",
    outlookClientSecret: "",

    gmailEnabled: false,
    gmailClientId: "",
    gmailClientSecret: "",
    gmailTopicName: "",

    webhooks: [],

    imapEnabled: false,

    currentTab: "overview",
    changed: false,
  };
};

export const defaultInitState: DashboardState = {
  projectName: "",
  environmentName: "",

  projectId: "",
  environmentId: "",

  publishableKey: "",
  secretKey: "",
  outlookEnabled: false,

  gmailEnabled: false,

  outlookClientId: "",
  outlookClientSecret: "",

  gmailClientId: "",
  gmailClientSecret: "",
  gmailTopicName: "",

  webhooks: [],

  imapEnabled: false,

  currentTab: "overview",
  changed: false,
};

export const createDashboardStore = (
  initState: DashboardState = defaultInitState
) => {
  return createStore<DashboardStore>()((set) => ({
    ...initState,
    changeEnvironmentOrProject: (
      projectName: string,
      environmentName: string,

      projectId: string,
      environmentId: string,

      publishableKey: string,
      secretKey: string,
      outlookEnabled: boolean,
      gmailEnabled: boolean,
      imapEnabled: boolean,

      webhooks: Webhook[],

      gmailCredentials?: {
        clientId: string;
        clientSecret: string;
        topicName: string;
      },
      outlookCredentials?: {
        clientId: string;
        clientSecret: string;
      }
    ) => {
      // Build payload and only include optional credential fields when provided.
      const payload: Partial<DashboardState & { changed: boolean }> = {
        projectName,
        environmentName,
        projectId,
        environmentId,
        publishableKey,
        secretKey,
        outlookEnabled,
        gmailEnabled,
        imapEnabled,
        webhooks,
        changed: false,
      };

      if (gmailCredentials?.clientId !== undefined)
        payload.gmailClientId = gmailCredentials?.clientId;
      if (gmailCredentials?.clientSecret !== undefined)
        payload.gmailClientSecret = gmailCredentials?.clientSecret;
      if (gmailCredentials?.topicName !== undefined)
        payload.gmailTopicName = gmailCredentials?.topicName;
      if (outlookCredentials?.clientId !== undefined)
        payload.outlookClientId = outlookCredentials?.clientId;
      if (outlookCredentials?.clientSecret !== undefined)
        payload.outlookClientSecret = outlookCredentials?.clientSecret;

      // Use a typed cast to satisfy the setter signature without using `any`.
      set(payload as Partial<DashboardStore>);
    },
    setProjectName: (projectName) => set({ projectName, changed: true }),
    setEnvironmentName: (environmentName) => set({ environmentName }), // Not currently allowing users to change

    setProjectId: (projectId) => set({ projectId }),
    setEnvironmentId: (environmentId) => set({ environmentId }),

    setPublishableKey: (publishableKey) => set({ publishableKey }), // Can only be edited in server action
    setSecretKey: (secretKey) => set({ secretKey }), // Can only be edited in server action
    setOutlookEnabled: (outlookEnabled) =>
      set({ outlookEnabled, changed: true }),
    setGmailEnabled: (gmailEnabled) => set({ gmailEnabled, changed: true }),
    setImapEnabled: (imapEnabled) => set({ imapEnabled, changed: true }),
    setCurrentTab: (currentTab) => set({ currentTab }), // Not stored in the Database so no need to set changed to true
    setChanged: (changed) => set({ changed }),
    setGmailClientId: (clientId) =>
      set({ gmailClientId: clientId, changed: true }),
    setGmailClientSecret: (clientSecret) =>
      set({ gmailClientSecret: clientSecret, changed: true }),
    setOutlookClientId: (clientId) =>
      set({ outlookClientId: clientId, changed: true }),
    setOutlookClientSecret: (clientSecret) =>
      set({ outlookClientSecret: clientSecret, changed: true }),
    setGmailTopicName: (topicName) =>
      set({ gmailTopicName: topicName, changed: true }),
    setWebhooks: (webhooks) => set({ webhooks, changed: true }),
  }));
};
