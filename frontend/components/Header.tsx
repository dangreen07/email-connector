'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Container from "@/components/Container";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setIsScrolled(window.scrollY > 4);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`sticky top-0 z-50 border-b transition-colors ${isScrolled ? "bg-white/70 dark:bg-neutral-950/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur" : "bg-transparent"}`}>
            <Container className="flex h-16 items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="font-semibold text-lg tracking-tight flex gap-1">
                        <Image src="/logo.png" alt="MailLink" width={32} height={32} />
                        MailLink
                    </Link>
                    <nav className="hidden md:flex md:items-center md:gap-6 text-sm">
                        <Link href="/" className="text-foreground/80 hover:text-foreground transition-colors">Home</Link>
                        <Link href="/docs" className="text-foreground/80 hover:text-foreground transition-colors">Docs</Link>
                        <Link href="/#pricing" className="text-foreground/80 hover:text-foreground transition-colors">Pricing</Link>
                    </nav>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />
                    <SignedOut>
                        <SignInButton>
                            <button className="px-4 py-2 text-sm font-medium rounded-md border border-foreground/20 hover:border-foreground/40 text-foreground/90 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500">
                                Log in
                            </button>
                        </SignInButton>
                        <SignUpButton>
                            <button className="px-4 py-2 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500">
                                Get Started
                            </button>
                        </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                        <Link href="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">Dashboard</Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                </div>

                <div className="md:hidden">
                    <button
                        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={isOpen}
                        onClick={() => setIsOpen((v) => !v)}
                        className="inline-flex items-center justify-center rounded-md p-2 text-foreground/80 hover:text-foreground hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {isOpen ? (
                                <path d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <>
                                    <path d="M3 6h18" />
                                    <path d="M3 12h18" />
                                    <path d="M3 18h18" />
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            </Container>

            {isOpen && (
                <div className="md:hidden border-t bg-white/80 dark:bg-neutral-950/70 backdrop-blur">
                    <Container className="py-3">
                        <nav className="flex flex-col gap-2">
                            <Link href="/" className="py-2 text-foreground/90 hover:text-foreground" onClick={() => setIsOpen(false)}>Home</Link>
                            <Link href="/docs" className="py-2 text-foreground/90 hover:text-foreground" onClick={() => setIsOpen(false)}>Docs</Link>
                            <Link href="/#pricing" className="py-2 text-foreground/90 hover:text-foreground" onClick={() => setIsOpen(false)}>Pricing</Link>
                            <div className="py-2">
                                <ThemeToggle />
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                                <SignedOut>
                                    <SignInButton>
                                        <button className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-foreground/20 text-foreground/90">
                                            Log in
                                        </button>
                                    </SignInButton>
                                    <SignUpButton>
                                        <button className="flex-1 px-4 py-2 text-sm font-semibold rounded-md bg-indigo-600 text-white">
                                            Get Started
                                        </button>
                                    </SignUpButton>
                                </SignedOut>
                                <SignedIn>
                                    <Link href="/app" className="px-4 py-2 text-sm font-semibold rounded-md bg-indigo-600 text-white">
                                        Open App
                                    </Link>
                                </SignedIn>
                            </div>
                        </nav>
                    </Container>
                </div>
            )}
        </header>
    );
}


