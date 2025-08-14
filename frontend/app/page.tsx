import Link from "next/link";
import Container from "@/components/Container";
import { GmailIcon, OutlookIcon, ImapIcon } from "@/components/icons";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgb(99_102_241/0.15),transparent_60%)]"></div>
        <Container className="pt-20 pb-16 sm:pt-24 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-500">Developer-first email connectivity</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">One API for Every Inbox</h1>
            <p className="mt-4 text-lg text-foreground/80">
              Connect Gmail, Outlook, and IMAP in minutes — no OAuth headaches or vendor lock-in.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              >
                Get Started
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-md border border-foreground/20 px-5 py-3 text-sm font-medium text-foreground/90 hover:border-foreground/40"
              >
                View Docs
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex items-center justify-center gap-6 text-foreground/70">
              <GmailIcon className="h-6 w-6" />
              <OutlookIcon className="h-6 w-6" />
              <ImapIcon className="h-6 w-6" />
            </div>

            {/* Code snippet */}
            <div className="mt-10 rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-left">
              <pre className="text-sm leading-6 text-foreground/90 overflow-x-auto"><code>{`import { ConnectInbox } from "emaillinkup-react";

<ConnectInbox onConnected={(token) => {
  // Use token with /messages and /send
}} />`}</code></pre>
            </div>
          </div>
        </Container>
      </section>

      {/* Social proof */}
      <section aria-label="Trusted by" className="py-10">
        <Container>
          <div className="grid grid-cols-2 gap-6 opacity-70 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-foreground/10" />
            ))}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to integrate email fast</h2>
            <p className="mt-3 text-foreground/80">Unified endpoints, webhooks, secure tokens, and a great developer experience.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Unified API", desc: "One endpoint for all providers." },
              { title: "Fast Setup", desc: "Connect an inbox in under 5 minutes." },
              { title: "Simple Pricing", desc: "No hidden fees, flat rate." },
              { title: "Webhooks", desc: "React to new mail instantly." },
              { title: "Secure by default", desc: "OAuth tokens encrypted at rest." },
              { title: "Great DX", desc: "Copy-paste snippets, sandbox keys." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-foreground/10 bg-background p-6">
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-foreground/80">{f.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { step: 1, title: "Add our Connect button", desc: "Drop-in UI to connect inboxes." },
              { step: 2, title: "User authenticates", desc: "Google/Microsoft or IMAP in one flow." },
              { step: 3, title: "Call /messages and /send", desc: "Use a single token for all operations." },
            ].map((s) => (
              <li key={s.step} className="rounded-xl border border-foreground/10 bg-background p-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">{s.step}</span>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-foreground/80">{s.desc}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center rounded-2xl border border-foreground/10 bg-[radial-gradient(60%_80%_at_50%_-20%,rgb(99_102_241/0.15),transparent_60%)] p-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to simplify email integration?</h2>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link href="/sign-up" className="rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500">Get Started</Link>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FAQs</h2>
            <p className="mt-3 text-foreground/80">Answers to common questions.</p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-foreground/10 rounded-xl border border-foreground/10">
            {[
              { q: "Which providers are supported?", a: "Gmail, Outlook, and any IMAP provider." },
              { q: "How do you handle security?", a: "OAuth tokens are encrypted at rest; we follow best practices." },
              { q: "Do you have webhooks?", a: "Yes, subscribe to new messages, send status, and more." },
              { q: "What is pricing?", a: "Simple flat-rate pricing with a generous free tier." },
              { q: "Is there a sandbox?", a: "Yes, use sandbox keys to develop safely." },
            ].map((item, idx) => (
              <details key={idx} className="group">
                <summary className="cursor-pointer list-none px-6 py-4 text-left font-medium hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <div className="flex items-center justify-between">
                    <span>{item.q}</span>
                    <span className="ml-4 h-5 w-5 rounded-full border border-foreground/20 text-foreground/70 inline-flex items-center justify-center">
                      <svg className="h-3 w-3 transition-transform group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </div>
                </summary>
                <div className="px-6 pb-4 text-sm text-foreground/80">{item.a}</div>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
