"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  BedDouble,
  Check,
  ConciergeBell,
  UtensilsCrossed,
} from "lucide-react";
import { Category, HotelService, Product } from "@/types";
import { createHotelOrder } from "@/lib/orders";
import MenuClient from "./menu-client";

type HotelView = "landing" | "menu" | "services" | "issues";

type Props = {
  restaurant: { id: string; name: string; slug: string; logoUrl?: string | null };
  categories: Category[];
  products: Product[];
  roomLabel: string;
  hotelServices: HotelService[];
  hotelIssues: HotelService[];
};

export default function HotelLandingClient({
  restaurant,
  categories,
  products,
  roomLabel,
  hotelServices,
  hotelIssues,
}: Props) {
  const [view, setView] = useState<HotelView>("landing");

  if (view === "menu") {
    return (
      <MenuClient
        restaurant={restaurant}
        categories={categories}
        products={products}
        tableNumber={null}
        roomLabel={roomLabel}
      />
    );
  }

  if (view === "services") {
    return (
      <HotelRequestView
        restaurant={restaurant}
        roomLabel={roomLabel}
        items={hotelServices}
        type="service"
        title="Service de chambre"
        subtitle="Sélectionnez les services souhaités"
        emptyText="Aucun service disponible pour le moment."
        onBack={() => setView("landing")}
      />
    );
  }

  if (view === "issues") {
    return (
      <HotelRequestView
        restaurant={restaurant}
        roomLabel={roomLabel}
        items={hotelIssues}
        type="issue"
        title="Signaler un problème"
        subtitle="Sélectionnez le(s) problème(s) rencontré(s)"
        emptyText="Aucune catégorie de problème configurée."
        onBack={() => setView("landing")}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-5 py-5">
          <div className="flex items-center gap-2.5">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                {restaurant.name}
              </h1>
              <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Chambre {roomLabel}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
        <p className="text-sm text-stone-500 text-center mb-2">
          Comment pouvons-nous vous aider ?
        </p>

        <button
          onClick={() => setView("menu")}
          className="w-full bg-white rounded-2xl border border-stone-200 p-6 flex items-center gap-5 hover:border-stone-400 hover:shadow-lg hover:shadow-stone-900/5 transition-all active:scale-[0.98] group"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#C8963E]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#e0c07a] transition-colors">
            <UtensilsCrossed className="w-7 h-7 text-[#8a6828]" />
          </div>
          <div className="text-left">
            <div className="font-bold text-stone-900 text-lg">
              Commander à manger ou à boire
            </div>
            <div className="text-sm text-stone-500 mt-0.5">
              Consultez notre menu et commandez depuis votre chambre
            </div>
          </div>
        </button>

        <button
          onClick={() => setView("services")}
          className="w-full bg-white rounded-2xl border border-stone-200 p-6 flex items-center gap-5 hover:border-stone-400 hover:shadow-lg hover:shadow-stone-900/5 transition-all active:scale-[0.98] group"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
            <ConciergeBell className="w-7 h-7 text-blue-700" />
          </div>
          <div className="text-left">
            <div className="font-bold text-stone-900 text-lg">
              Demander un service de chambre
            </div>
            <div className="text-sm text-stone-500 mt-0.5">
              Serviettes, oreillers, nettoyage et plus
            </div>
          </div>
        </button>

        <button
          onClick={() => setView("issues")}
          className="w-full bg-white rounded-2xl border border-stone-200 p-6 flex items-center gap-5 hover:border-stone-400 hover:shadow-lg hover:shadow-stone-900/5 transition-all active:scale-[0.98] group"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
            <BedDouble className="w-7 h-7 text-red-700" />
          </div>
          <div className="text-left">
            <div className="font-bold text-stone-900 text-lg">
              Signaler un problème
            </div>
            <div className="text-sm text-stone-500 mt-0.5">
              Climatisation, WiFi, bruit ou autre
            </div>
          </div>
        </button>
      </div>
    </main>
  );
}

function HotelRequestView({
  restaurant,
  roomLabel,
  items,
  type,
  title,
  subtitle,
  emptyText,
  onBack,
}: {
  restaurant: { id: string; name: string; slug: string };
  roomLabel: string;
  items: HotelService[];
  type: "service" | "issue";
  title: string;
  subtitle: string;
  emptyText: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    const selectedItems = items.filter((i) => selected.has(i.id));
    if (selectedItems.length === 0) return;

    setSubmitting(true);
    setError(null);

    const res = await createHotelOrder(
      restaurant.id,
      roomLabel,
      type,
      selectedItems.map((i) => ({ id: i.id, label: i.label })),
    );

    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    fetch("/api/orders/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: res.orderId }),
    }).catch(() => {});

    router.push(
      `/r/${restaurant.slug}/order/${res.orderId}?room=${encodeURIComponent(roomLabel)}`,
    );
  };

  return (
    <main className="min-h-screen bg-stone-50 pb-32">
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Chambre {roomLabel}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <ConciergeBell className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-500">{emptyText}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-4">{subtitle}</p>
            <div className="space-y-2">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? "bg-[#722F37] text-white border-[#722F37]"
                        : "bg-white text-stone-900 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "border-white bg-white"
                          : "border-stone-300"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-stone-900" />
                      )}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200">
          <div className="max-w-2xl mx-auto px-5 py-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-[#722F37] text-white font-bold text-base hover:bg-[#5a2530] disabled:opacity-50 transition-colors"
            >
              {submitting
                ? "Envoi en cours..."
                : `Envoyer la demande (${selected.size})`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
