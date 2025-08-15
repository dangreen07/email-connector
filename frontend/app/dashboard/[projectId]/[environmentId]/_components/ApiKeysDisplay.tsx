"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/dashboard/dashboard-store-provider";

export default function ApiKeysDisplay() {
    const { publishableKey, secretKey } = useDashboardStore((state) => state);

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
        }
    }

    const handleRegenerate = () => {
        console.log("Regenerate");
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>API keys</CardTitle>
                <CardDescription>Use these keys to authenticate requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="public-key">Publishable key</Label>
                    <div className="flex items-center gap-2">
                        <Input id="public-key" value={publishableKey} readOnly className="font-mono" />
                        <Button variant="outline" onClick={() => handleCopy(publishableKey)}>Copy</Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="private-key">Secret key</Label>
                    <div className="flex items-center gap-2">
                        <Input id="private-key" type="password" value={secretKey} readOnly className="font-mono" />
                        <Button variant="outline" onClick={() => handleCopy(secretKey)}>Copy</Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
                <p className="text-xs text-foreground/70">Keys are environment-scoped.</p>
                <Button variant="secondary" onClick={handleRegenerate}>Regenerate</Button>
            </CardFooter>
        </Card>
    )
}