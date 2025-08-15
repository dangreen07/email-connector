"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuickStartGuide() {
    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Quick Start Guide</CardTitle>
                <CardDescription>
                    Follow these steps to get started with your project.
                </CardDescription>
            </CardHeader>
            <CardContent>
            </CardContent>
        </Card>
    )
}