import { resolvePaymentToken } from "@/lib/payment-tokens";
import PaymentClient from "./payment-client";

type Props = { params: Promise<{ token: string }> };

export default async function PaymentPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolvePaymentToken(token);

  if (!resolved) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">&#10060;</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">
            Lien invalide ou expiré
          </h1>
          <p className="text-sm text-stone-500">
            Ce lien de paiement n&apos;est plus valide. Veuillez contacter
            votre administrateur pour recevoir un nouveau lien.
          </p>
        </div>
      </main>
    );
  }

  const restaurant = resolved.restaurants;

  return (
    <PaymentClient
      token={token}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      currentExpiry={restaurant.subscription_expires_at}
      isActive={restaurant.active}
    />
  );
}
