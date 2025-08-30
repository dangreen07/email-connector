import { createStore } from "zustand/vanilla";

export type DashboardState = {
  projectName: string;
  environmentName: string;

  publishableKey: string;
  secretKey: string;

  outlookEnabled: boolean;
  outlookClientId?: string;
  outlookClientSecret?: string;

  gmailEnabled: boolean;
  gmailClientId?: string;
  gmailClientSecret?: string;

  imapEnabled: boolean;
  currentTab: "connections" | "settings";

  changed: boolean;
};

export type DashboardActions = {
  changeEnvironmentOrProject: (
    projectName: string,
    environmentName: string,
    publishableKey: string,
    secretKey: string,
    outlookEnabled: boolean,
    gmailEnabled: boolean,
    imapEnabled: boolean,
    gmailClientId?: string,
    gmailClientSecret?: string,
    outlookClientId?: string,
    outlookClientSecret?: string
  ) => void;
  setProjectName: (projectName: string) => void;
  setEnvironmentName: (environmentName: string) => void;
  setPublishableKey: (publishableKey: string) => void;
  setSecretKey: (secretKey: string) => void;
  setOutlookEnabled: (outlookEnabled: boolean) => void;
  setGmailEnabled: (gmailEnabled: boolean) => void;
  setImapEnabled: (imapEnabled: boolean) => void;
  setCurrentTab: (currentTab: "connections" | "settings") => void;
  setChanged: (changed: boolean) => void;
  setGmailClientId: (clientId: string) => void;
  setGmailClientSecret: (clientSecret: string) => void;
  setOutlookClientId: (clientId: string) => void;
  setOutlookClientSecret: (clientSecret: string) => void;
};

export type DashboardStore = DashboardState & DashboardActions;

export const initDashboardStore = (): DashboardState => {
  return {
    projectName: "",
    environmentName: "",
    publishableKey: "",
    secretKey: "",
    outlookEnabled: false,

    gmailEnabled: false,

    imapEnabled: false,

    currentTab: "connections",
    changed: false,
  };
};

export const defaultInitState: DashboardState = {
  projectName: "",
  environmentName: "",
  publishableKey: "",
  secretKey: "",
  outlookEnabled: false,

  gmailEnabled: false,

  imapEnabled: false,

  currentTab: "connections",
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
      publishableKey: string,
      secretKey: string,
      outlookEnabled: boolean,
      gmailEnabled: boolean,
      imapEnabled: boolean,
      gmailClientId?: string,
      gmailClientSecret?: string,
      outlookClientId?: string,
      outlookClientSecret?: string
    ) =>
      set({
        projectName,
        environmentName,
        publishableKey,
        secretKey,
        outlookEnabled,
        gmailEnabled,
        imapEnabled,
        changed: false,
        gmailClientId: gmailClientId,
        gmailClientSecret: gmailClientSecret,
        outlookClientId: outlookClientId,
        outlookClientSecret: outlookClientSecret,
      }),
    setProjectName: (projectName) => set({ projectName, changed: true }),
    setEnvironmentName: (environmentName) => set({ environmentName }), // Not currently allowing users to change
    setPublishableKey: (publishableKey) => set({ publishableKey }), // Not currently allowing users to change
    setSecretKey: (secretKey) => set({ secretKey }), // Not currently allowing users to change
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
  }));
};
