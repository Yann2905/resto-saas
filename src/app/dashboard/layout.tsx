import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import DashboardNav from "./_components/dashboard-nav";
import OrderSoundAlert from "./_components/order-sound-alert";
import PwaRegister from "./_components/pwa-register";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <DashboardNav />
      <OrderSoundAlert />
      <PwaRegister />
      {children}
    </AuthProvider>
  );
}
