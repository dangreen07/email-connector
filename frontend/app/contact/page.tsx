import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact | MailLink",
  description: "Get in touch with the MailLink team.",
};

export default function ContactPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <div className="container max-w-xl py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              You can reach us anytime at{" "}
              <a
                href={`mailto:${process.env.CONTACT_EMAIL}`}
                className="underline underline-offset-4"
              >
                {process.env.CONTACT_EMAIL}
              </a>
              .
            </p>
            <p>
              Or connect with the founder on X/Twitter:{" "}
              <a
                href="https://x.com/DanielGreen_"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                @DanielGreen_
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
