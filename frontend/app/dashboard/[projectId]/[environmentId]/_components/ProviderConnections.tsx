"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";

export default function ProviderConnections() {
    const {
        outlookEnabled,
        gmailEnabled,
        imapEnabled,
        setOutlookEnabled,
        setGmailEnabled,
        setImapEnabled,
    } = useDashboardStore((state) => state);

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Provider connections</CardTitle>
                <CardDescription>Toggle providers on or off for this environment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <h3 className="text-sm font-medium">Outlook (Microsoft 365)</h3>
                            <p className="text-xs text-foreground/70">Enable Outlook for this environment.</p>
                        </div>
                        <Switch checked={outlookEnabled} onCheckedChange={setOutlookEnabled} aria-label="Toggle Outlook" />
                    </div>
                    <Separator />
                </div>

                <div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <h3 className="text-sm font-medium">Gmail</h3>
                            <p className="text-xs text-foreground/70">Enable Gmail for this environment.</p>
                        </div>
                        <Switch checked={gmailEnabled} onCheckedChange={setGmailEnabled} aria-label="Toggle Gmail" />
                    </div>
                    <Separator />
                </div>

                <div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <h3 className="text-sm font-medium">IMAP/SMTP (optional)</h3>
                            <p className="text-xs text-foreground/70">Enable generic IMAP/SMTP for testing.</p>
                        </div>
                        <Switch checked={imapEnabled} onCheckedChange={setImapEnabled} aria-label="Toggle IMAP" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}