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

export default function ProviderConnections() {
  const {
    environmentName,
    outlookEnabled,
    gmailEnabled,
    imapEnabled,
    gmailClientId,
    gmailClientSecret,
    outlookClientId,
    outlookClientSecret,
    setOutlookEnabled,
    setGmailEnabled,
    setImapEnabled,
    setGmailClientId,
    setGmailClientSecret,
    setOutlookClientId,
    setOutlookClientSecret,
  } = useDashboardStore((state) => state);

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
