import Link from "next/link";
import Container from "@/components/Container";

export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="border-t py-8 text-sm">
            <Container className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-foreground/70">MailLink © {year}</div>
                <nav className="flex items-center gap-6">
                    <Link href="/privacy" className="text-foreground/80 hover:text-foreground">Privacy</Link>
                    <Link href="/terms" className="text-foreground/80 hover:text-foreground">Terms</Link>
                    <Link href="/contact" className="text-foreground/80 hover:text-foreground">Contact</Link>
                </nav>
            </Container>
        </footer>
    );
}


