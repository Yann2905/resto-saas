import { AuthProvider } from "@/lib/auth-context";
import DashboardNav from "./_components/dashboard-nav";
import OrderSoundAlert from "./_components/order-sound-alert";
import PwaRegister from "./_components/pwa-register";

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
