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
} from "./_components";
import { Button } from "@/components/ui/button";
import { UpdateEnvironmentSettings } from "../../_actions";
import { DashboardProvider } from "@/utils/types";

export default function EnvironmentDashboard(props: {
  projectId: string;
  environmentId: string;
  projectName: string;
  environmentName: string;
  publishableKey: string;
  secretKey: string;
  providers: DashboardProvider[];
}) {
  const {
    projectName: projectNameProp,
    environmentName: environmentNameProp,
    publishableKey: publishableKeyProp,
    secretKey: secretKeyProp,
    providers,
    projectId,
    environmentId,
  } = props;

  const {
    changeEnvironmentOrProject,
    setCurrentTab,
    currentTab,
    changed,
    projectName,
    outlookEnabled,
    gmailEnabled,
    imapEnabled,
    outlookClientId,
    outlookClientSecret,
    gmailClientId,
    gmailClientSecret,
    setChanged,
  } = useDashboardStore((state) => state);

  const enabledProviderToBoolean = useCallback(
    (provider: string): boolean =>
      providers.find((p) => p.providerCode === provider)?.enabled ?? false,
    [providers]
  );

  const getProviderCredentials = useCallback(
    (provider: string) =>
      providers.find((p) => p.providerCode === provider)?.credentials,
    [providers]
  );

  useEffect(() => {
    const gmailCredentials = getProviderCredentials("gmail");
    const outlookCredentials = getProviderCredentials("outlook");
    changeEnvironmentOrProject(
      projectNameProp,
      environmentNameProp,
      publishableKeyProp,
      secretKeyProp,
      enabledProviderToBoolean("outlook"),
      enabledProviderToBoolean("gmail"),
      enabledProviderToBoolean("smtp-imap"),
      gmailCredentials?.clientId,
      gmailCredentials?.clientSecret,
      outlookCredentials?.clientId,
      outlookCredentials?.clientSecret
    );
  }, [
    projectNameProp,
    environmentNameProp,
    publishableKeyProp,
    secretKeyProp,
    changeEnvironmentOrProject,
    enabledProviderToBoolean,
    getProviderCredentials,
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
            <TabsTrigger value="connections">Connections</TabsTrigger>
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
                      }
                    : undefined;
                await UpdateEnvironmentSettings(
                  projectId,
                  environmentId,
                  projectName,
                  outlookEnabled,
                  gmailEnabled,
                  imapEnabled,
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

        <TabsContent value="connections" className="mt-3">
          <div className="grid gap-6 lg:grid-cols-3">
            <QuickStartGuide />
            <ApiKeysDisplay />
          </div>
        </TabsContent>
        <TabsContent value="settings" className="mt-3">
          <div className="grid gap-6 lg:grid-cols-3">
            <ProjectDetails />
            <DangerZone />
            <ProviderConnections />
          </div>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
