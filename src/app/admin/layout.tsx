import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import AdminNav from "./_components/admin-nav";
import AdminGuard from "./_components/admin-guard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminGuard>
        <AdminNav />
        {children}
      </AdminGuard>
    </AuthProvider>
  );
}
