"use client";

import Container from "@/components/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallback, useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";
import {
  QuickStartGuide,
  ApiKeysDisplay,
  ProjectDetails,
  DangerZone,
  ProviderConnections,
  WebhooksManager,
  LogsViewer,
} from "./_components";
import { Button } from "@/components/ui/button";
import { UpdateEnvironmentSettings } from "../../_actions";
import { DashboardProvider } from "@/utils/types";
import { Webhook, Log } from "@/utils/db/schema";

export default function EnvironmentDashboard(props: {
  projectId: string;
  environmentId: string;
  projectName: string;
  environmentName: string;
  publishableKey: string;
  secretKey: string;
  providers: DashboardProvider[];
  webhooks: Webhook[];
  logs: Log[];
  totalLogs: number;
}) {
  const {
    projectName: projectNameProp,
    environmentName: environmentNameProp,
    publishableKey: publishableKeyProp,
    secretKey: secretKeyProp,
    providers,
    projectId,
    environmentId,
    webhooks: initialWebhooks,
    logs: logsProp,
    totalLogs,
  } = props;

  const {
    changeEnvironmentOrProject,
    setCurrentTab,
    currentTab,
    changed,
    webhooks,
    projectName,
    outlookEnabled,
    gmailEnabled,
    imapEnabled,
    outlookClientId,
    outlookClientSecret,
    gmailClientId,
    gmailClientSecret,
    gmailTopicName,
    setChanged,
  } = useDashboardStore((state) => state);

  const enabledProviderToBoolean = useCallback(
    (provider: string): boolean =>
      providers.find((p) => p.providerCode === provider)?.enabled ?? false,
    [providers]
  );

  const getProviderCredentials = useCallback(
    (provider: "gmail" | "outlook") => {
      const found = providers.find((p) => p.providerCode == provider);
      if (!found || found.providerCode == "smtp-imap") {
        return null;
      } else if (found.providerCode == "gmail") {
        return {
          type: "gmail" as const,
          credentials: found.credentials,
        };
      } else {
        return {
          type: "outlook" as const,
          credentials: found.credentials,
        };
      }
    },
    [providers]
  );

  useEffect(() => {
    const gmailCredentials = getProviderCredentials("gmail") as {
      type: "gmail";
      credentials:
        | {
            clientId: string;
            clientSecret: string;
            topicName: string;
          }
        | undefined;
    } | null;
    const outlookCredentials = getProviderCredentials("outlook") as {
      type: "outlook";
      credentials:
        | {
            clientId: string;
            clientSecret: string;
          }
        | undefined;
    } | null;
    changeEnvironmentOrProject(
      projectNameProp,
      environmentNameProp,
      projectId,
      environmentId,
      publishableKeyProp,
      secretKeyProp,
      enabledProviderToBoolean("outlook"),
      enabledProviderToBoolean("gmail"),
      enabledProviderToBoolean("smtp-imap"),
      initialWebhooks,
      gmailCredentials?.credentials,
      outlookCredentials?.credentials
    );
  }, [
    projectNameProp,
    environmentNameProp,
    projectId,
    environmentId,
    publishableKeyProp,
    secretKeyProp,
    changeEnvironmentOrProject,
    enabledProviderToBoolean,
    getProviderCredentials,
    initialWebhooks,
  ]);

  const [isSaving, setIsSaving] = useState(false);

  return (
    <Container>
      <Tabs
        value={currentTab}
        onValueChange={(v) => setCurrentTab(v as typeof currentTab)}
        className="py-3"
      >
        <div className="flex justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Project Settings</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="default"
              disabled={!changed}
              onClick={async () => {
                setIsSaving(true);
                const outlookCredentials =
                  outlookClientId && outlookClientSecret
                    ? {
                        clientId: outlookClientId,
                        clientSecret: outlookClientSecret,
                      }
                    : undefined;
                const gmailCredentials =
                  gmailClientId && gmailClientSecret
                    ? {
                        clientId: gmailClientId,
                        clientSecret: gmailClientSecret,
                        topicName: gmailTopicName,
                      }
                    : undefined;
                await UpdateEnvironmentSettings(
                  projectId,
                  environmentId,
                  projectName,
                  outlookEnabled,
                  gmailEnabled,
                  imapEnabled,
                  webhooks,
                  outlookCredentials,
                  gmailCredentials
                );
                setChanged(false);
                setIsSaving(false);
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="mt-3">
          <div className="grid gap-6 lg:grid-cols-3">
            <QuickStartGuide />
            <ApiKeysDisplay />
          </div>
        </TabsContent>
        <TabsContent value="providers" className="mt-3">
          <div className="grid">
            <ProviderConnections />
          </div>
        </TabsContent>
        <TabsContent value="webhooks" className="mt-3">
          <div className="grid gap-6 lg:grid-cols-3">
            <WebhooksManager />
          </div>
        </TabsContent>
        <TabsContent value="logs" className="mt-3">
          <div className="grid">
            <LogsViewer initialLogs={logsProp} initialTotal={totalLogs} />
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-3">
          <div className="grid gap-6 lg:grid-cols-3">
            <ProjectDetails />
            <DangerZone />
          </div>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
