import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getServerAuthSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "AdmitFlow | Education & Admissions Management CRM",
  description:
    "Multi-tenant admissions pipeline, counselor workflows, and applicant conversion platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider initialSession={session}>
          <DashboardShell>{children}</DashboardShell>
        </AuthProvider>
      </body>
    </html>
  );
}
