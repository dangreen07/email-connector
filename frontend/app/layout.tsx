import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://maillink.co"),
  title: "MailLink - One API for Every Inbox",
  description: "Connect Gmail, Outlook, and IMAP in minutes. Developer-first email connectivity without OAuth headaches.",
  openGraph: {
    title: "MailLink - One API for Every Inbox",
    description:
      "Connect Gmail, Outlook, and IMAP in minutes. Developer-first email connectivity without OAuth headaches.",
    url: "https://maillink.co",
    siteName: "MailLink",
    images: [
      {
        url: "/vercel.svg",
        width: 1200,
        height: 630,
        alt: "MailLink preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      waitlistUrl="/waitlist"
      appearance={{
        variables: {
          colorPrimary: "#4f46e5",
          colorBackground: "var(--background)",
          colorText: "var(--foreground)",
          colorInputBackground: "color-mix(in oklab, var(--foreground) 6%, transparent)",
          colorInputText: "var(--foreground)",
        },
        elements: {
          card: "bg-background/95 backdrop-blur border border-foreground/10 shadow-xl",
          headerTitle: "text-foreground",
          headerSubtitle: "text-foreground/70",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white",
          socialButtonsBlockButton: "border border-foreground/20 hover:bg-foreground/5",
          formFieldLabel: "text-foreground/80",
          input: "bg-foreground/5 border border-foreground/20 text-foreground placeholder:text-foreground/50",
          footerActionText: "text-foreground/80",
          // User profile / user button popover overrides
          userButtonPopoverCard: "bg-background/95 backdrop-blur border border-foreground/10 !text-foreground",
          userButtonPopoverActionButton: "!text-foreground hover:bg-foreground/5",
          userButtonPopoverActionButtonIcon: "!text-foreground",
          userButtonPopoverActionButtonText: "!text-foreground",
          userButtonPopoverFooter: "!text-foreground/70",
          userPreviewMainIdentifier: "!text-foreground",
          userPreviewSecondaryIdentifier: "!text-foreground/70",
        },
      }}
    >
      <html lang="en" className="h-full" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-background text-foreground overflow-auto`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Header />
            <main className="min-h-[calc(100vh-9.5rem)]">{children}</main>
            <Footer />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
