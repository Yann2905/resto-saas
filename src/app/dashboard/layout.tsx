import { AuthProvider } from "@/lib/auth-context";
import DashboardNav from "./_components/dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardNav />
      {children}
    </AuthProvider>
  );
}
