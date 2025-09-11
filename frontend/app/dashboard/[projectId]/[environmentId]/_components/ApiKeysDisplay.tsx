"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";
import { toast } from "sonner";
import { regenerateKeys } from "@/app/dashboard/_actions";

export default function ApiKeysDisplay() {
  const {
    publishableKey,
    secretKey,
    environmentId,
    setPublishableKey,
    setSecretKey,
  } = useDashboardStore((state) => state);

  const handleCopy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(message);
    } catch {}
  };

  const handleRegenerate = async () => {
    const keys = await regenerateKeys(environmentId);
    if (!keys.error) {
      setPublishableKey(keys.publishableKey);
      setSecretKey(keys.secretKey);
      toast("API keys regenerated! Make sure to update your API calls!");
    } else {
      toast("Failed to regenerate API Keys!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          Use these keys to authenticate requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="public-key">Publishable key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="public-key"
              value={publishableKey}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              onClick={() =>
                handleCopy(
                  publishableKey,
                  "Copied publishable key to clipboard!"
                )
              }
            >
              Copy
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="private-key">Secret key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="private-key"
              type="password"
              value={secretKey}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              onClick={() =>
                handleCopy(secretKey, "Copied secret key to clipboard!")
              }
            >
              Copy
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <p className="text-xs text-foreground/70">
          Keys are environment-scoped.
        </p>
        <Button variant="secondary" onClick={handleRegenerate}>
          Regenerate
        </Button>
      </CardFooter>
    </Card>
  );
}
