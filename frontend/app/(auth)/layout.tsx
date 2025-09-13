export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-[calc(100vh-9.5rem)] flex items-center justify-center py-8 sm:py-12">
      {children}
    </div>
  );
}
