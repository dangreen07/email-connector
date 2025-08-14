export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen flex items-center justify-center py-12 sm:py-16">
            <div className="w-full max-w-md px-4 sm:px-0">
                {children}
            </div>
        </div>
    );
}