"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProviderConnections() {
  const {
    environmentName,
    environmentId,
    outlookEnabled,
    gmailEnabled,
    imapEnabled,
    gmailClientId,
    gmailClientSecret,
    gmailTopicName,
    outlookClientId,
    outlookClientSecret,
    setOutlookEnabled,
    setGmailEnabled,
    setImapEnabled,
    setGmailClientId,
    setGmailClientSecret,
    setGmailTopicName,
    setOutlookClientId,
    setOutlookClientSecret,
  } = useDashboardStore((state) => state);

  const gmailPushEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_ORIGIN}/v1/webhook/gmail/${environmentId}`;

  const handleCopy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(message);
    } catch {}
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Provider connections</CardTitle>
        <CardDescription>
          Toggle providers on or off for this environment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Outlook */}
        <div>
          <div className="flex items-center justify-between py-2">
            <div>
              <h3 className="text-sm font-medium">Outlook (Microsoft 365)</h3>
              <p className="text-xs text-foreground/70">
                Enable Outlook for this environment.
              </p>
            </div>
            <Switch
              checked={outlookEnabled}
              onCheckedChange={setOutlookEnabled}
              aria-label="Toggle Outlook"
            />
          </div>

          {environmentName === "production" && outlookEnabled ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="outlook-client-id">Client ID</Label>
                <Input
                  id="outlook-client-id"
                  value={outlookClientId}
                  onChange={(value) =>
                    setOutlookClientId(value.currentTarget.value)
                  }
                  placeholder="Enter Outlook Client ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="outlook-client-secret">Client Secret</Label>
                <Input
                  id="outlook-client-secret"
                  type="password"
                  value={outlookClientSecret}
                  onChange={(value) =>
                    setOutlookClientSecret(value.currentTarget.value)
                  }
                  placeholder="Enter Outlook Client Secret"
                />
              </div>
            </div>
          ) : null}

          <Separator className="mt-4" />
        </div>

        {/* Gmail */}
        <div>
          <div className="flex items-center justify-between py-2">
            <div>
              <h3 className="text-sm font-medium">Gmail</h3>
              <p className="text-xs text-foreground/70">
                Enable Gmail for this environment.
              </p>
            </div>
            <Switch
              checked={gmailEnabled}
              onCheckedChange={setGmailEnabled}
              aria-label="Toggle Gmail"
            />
          </div>

          {environmentName === "production" && gmailEnabled ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-2">
                <Label>Push Endpoint</Label>
                <div className="flex min-w-0 w-full gap-2 items-center">
                  <p
                    id="gmail-push-endpoint"
                    className="flex-1 truncate text-sm px-4 py-2 h-10 border-input bg-transparent dark:bg-input/30 border drop-shadow-lg rounded-md shadow-xs"
                  >
                    {gmailPushEndpoint}
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      handleCopy(
                        gmailPushEndpoint,
                        "Copied gmail push endpoint to clipboard!"
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-topic-name">Topic Name</Label>
                <Input
                  id="gmail-topic-name"
                  placeholder="projects/your-awesome-project/subscriptions/gmail-notify"
                  onChange={(value) =>
                    setGmailTopicName(value.currentTarget.value)
                  }
                  value={gmailTopicName}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-client-id">Client ID</Label>
                <Input
                  id="gmail-client-id"
                  placeholder="Enter Gmail Client ID"
                  onChange={(value) =>
                    setGmailClientId(value.currentTarget.value)
                  }
                  value={gmailClientId}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-client-secret">Client Secret</Label>
                <Input
                  id="gmail-client-secret"
                  type="password"
                  placeholder="Enter Gmail Client Secret"
                  onChange={(value) =>
                    setGmailClientSecret(value.currentTarget.value)
                  }
                  value={gmailClientSecret}
                />
              </div>
            </div>
          ) : null}

          <Separator className="mt-4" />
        </div>

        {/* IMAP/SMTP */}
        <div>
          <div className="flex items-center justify-between py-2">
            <div>
              <h3 className="text-sm font-medium">SMTP/IMAP</h3>
              <p className="text-xs text-foreground/70">
                Enable generic IMAP/SMTP for this environment.
              </p>
            </div>
            <Switch
              checked={imapEnabled}
              onCheckedChange={setImapEnabled}
              aria-label="Toggle IMAP"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
