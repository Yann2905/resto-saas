"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

type PriceRow = { duration: string; price: string; perMonth: string | null };
type Plan = {
  name: string;
  prices: PriceRow[];
  desc: string;
  capacity: string;
  popular?: boolean;
  features: string[];
  cta: string;
};
type SetupOption = {
  price: string;
  desc: string;
  items: string[];
};
type TabData = {
  label: string;
  plans: Plan[];
  setup: SetupOption;
};

const TABS: TabData[] = [
  {
    label: "Restaurant",
    plans: [
      {
        name: "Starter",
        prices: [
          { duration: "1 mois", price: "10 000", perMonth: null },
          { duration: "6 mois", price: "50 000", perMonth: "8 300" },
          { duration: "1 an", price: "90 000", perMonth: "7 500" },
        ],
        desc: "Idéal pour les petits restaurants et maquis",
        capacity: "10 tables",
        features: [
          "Commandes illimitées",
          "QR codes par table",
          "Menu digital complet",
          "Signal sonore × 3",
          "Gestion de stock",
          "Code PIN sécurité",
          "Paiement Mobile Money",
          "Suivi commande client",
        ],
        cta: "Commencer avec Starter",
      },
      {
        name: "Pro",
        prices: [
          { duration: "1 mois", price: "15 000", perMonth: null },
          { duration: "6 mois", price: "75 000", perMonth: "12 500" },
          { duration: "1 an", price: "130 000", perMonth: "10 800" },
        ],
        desc: "Pour les restaurants avec une équipe de serveurs",
        capacity: "30 tables",
        popular: true,
        features: [
          "Tout de Starter, plus :",
          "Comptes serveurs (jusqu’à 3)",
          "Attribution par zone de tables",
          "Notifications push (app fermée)",
          "Statistiques complètes",
          "Support WhatsApp prioritaire",
        ],
        cta: "Commencer avec Pro",
      },
      {
        name: "Business",
        prices: [
          { duration: "1 mois", price: "30 000", perMonth: null },
          { duration: "6 mois", price: "150 000", perMonth: "25 000" },
          { duration: "1 an", price: "280 000", perMonth: "23 300" },
        ],
        desc: "Pour les grands restaurants et chaînes",
        capacity: "200 tables",
        features: [
          "Tout de Pro, plus :",
          "Serveurs illimités",
          "Jusqu’à 200 tables",
          "Support WhatsApp dédié 24/7",
          "Export données (Excel)",
          "Multi-site",
        ],
        cta: "Commencer avec Business",
      },
    ],
    setup: {
      price: "15 000",
      desc: "On s’occupe de tout, vous n’avez rien à faire",
      items: [
        "Configuration complète du restaurant",
        "Ajout de toutes les photos du menu",
        "Création des comptes serveurs",
        "Formation personnalisée",
        "QR codes en fichier PDF",
      ],
    },
  },
  {
    label: "Hôtel",
    plans: [
      {
        name: "Starter",
        prices: [
          { duration: "1 mois", price: "15 000", perMonth: null },
          { duration: "6 mois", price: "75 000", perMonth: "12 500" },
          { duration: "1 an", price: "135 000", perMonth: "11 250" },
        ],
        desc: "Pour les petits hôtels et résidences",
        capacity: "20 chambres",
        features: [
          "QR code par chambre",
          "Room service digital",
          "Demandes de service",
          "Signalement de problèmes",
          "Notifications en temps réel",
          "Gestion de stock",
          "Suivi client en direct",
        ],
        cta: "Commencer avec Starter",
      },
      {
        name: "Pro",
        prices: [
          { duration: "1 mois", price: "25 000", perMonth: null },
          { duration: "6 mois", price: "125 000", perMonth: "20 800" },
          { duration: "1 an", price: "230 000", perMonth: "19 200" },
        ],
        desc: "Pour les hôtels avec une équipe structurée",
        capacity: "60 chambres",
        popular: true,
        features: [
          "Tout de Starter, plus :",
          "Comptes personnel (jusqu’à 5)",
          "Attribution par étage / zone",
          "Notifications push (app fermée)",
          "Statistiques complètes",
          "Support WhatsApp prioritaire",
        ],
        cta: "Commencer avec Pro",
      },
      {
        name: "Business",
        prices: [
          { duration: "1 mois", price: "45 000", perMonth: null },
          { duration: "6 mois", price: "225 000", perMonth: "37 500" },
          { duration: "1 an", price: "420 000", perMonth: "35 000" },
        ],
        desc: "Pour les grands hôtels et chaînes hôtelières",
        capacity: "200 chambres",
        features: [
          "Tout de Pro, plus :",
          "Personnel illimité",
          "Jusqu’à 200 chambres",
          "Support WhatsApp dédié 24/7",
          "Export données (Excel)",
          "Multi-site",
        ],
        cta: "Commencer avec Business",
      },
    ],
    setup: {
      price: "20 000",
      desc: "Configuration complète de votre hôtel",
      items: [
        "Configuration de toutes les chambres",
        "Liste des services personnalisée",
        "Liste des problèmes courants",
        "Création des comptes personnel",
        "Formation personnalisée",
        "QR codes en fichier PDF",
      ],
    },
  },
  {
    label: "Restaurant + Hôtel",
    plans: [
      {
        name: "Starter",
        prices: [
          { duration: "1 mois", price: "20 000", perMonth: null },
          { duration: "6 mois", price: "100 000", perMonth: "16 700" },
          { duration: "1 an", price: "180 000", perMonth: "15 000" },
        ],
        desc: "Pour les hôtels-restaurants de petite taille",
        capacity: "10 tables + 20 chambres",
        features: [
          "Menu digital + room service",
          "QR codes tables et chambres",
          "Demandes de service + problèmes",
          "Signal sonore × 3",
          "Gestion de stock",
          "Suivi commande client",
          "Paiement Mobile Money",
        ],
        cta: "Commencer avec Starter",
      },
      {
        name: "Pro",
        prices: [
          { duration: "1 mois", price: "35 000", perMonth: null },
          { duration: "6 mois", price: "175 000", perMonth: "29 200" },
          { duration: "1 an", price: "320 000", perMonth: "26 700" },
        ],
        desc: "Pour les hôtels-restaurants avec une vraie équipe",
        capacity: "30 tables + 60 chambres",
        popular: true,
        features: [
          "Tout de Starter, plus :",
          "Comptes personnel (jusqu’à 5)",
          "Attribution tables + chambres",
          "Notifications push (app fermée)",
          "Statistiques complètes",
          "Support WhatsApp prioritaire",
        ],
        cta: "Commencer avec Pro",
      },
      {
        name: "Business",
        prices: [
          { duration: "1 mois", price: "60 000", perMonth: null },
          { duration: "6 mois", price: "300 000", perMonth: "50 000" },
          { duration: "1 an", price: "560 000", perMonth: "46 700" },
        ],
        desc: "Pour les grands complexes hôteliers",
        capacity: "200 tables + 200 chambres",
        features: [
          "Tout de Pro, plus :",
          "Personnel illimité",
          "Capacité maximale",
          "Support WhatsApp dédié 24/7",
          "Export données (Excel)",
          "Multi-site",
        ],
        cta: "Commencer avec Business",
      },
    ],
    setup: {
      price: "30 000",
      desc: "On configure restaurant et hôtel ensemble",
      items: [
        "Configuration restaurant + chambres",
        "Ajout menu avec photos",
        "Liste des services hôteliers",
        "Création des comptes personnel",
        "Formation complète de l’équipe",
        "QR codes tables + chambres en PDF",
      ],
    },
  },
];

const whatsappUrl =
  "https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20%C3%A9tablissement.";

export default function PricingTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS[activeTab];

  return (
    <>
      {/* Tab selector */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex rounded-full border border-stone-700 bg-stone-900/80 p-1 backdrop-blur">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActiveTab(i)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === i
                  ? "bg-gradient-to-b from-[#C8963E] to-[#a07832] text-white shadow-lg"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Installation */}
      <div className="mb-20">
        <h3 className="text-center text-xl font-bold mb-8">
          Frais d&apos;installation{" "}
          <span className="text-stone-500 font-normal">(une seule fois)</span>
        </h3>
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-stone-800 bg-[#722F37]/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Installation</h3>
                <p className="text-sm text-stone-500 mt-1">{tab.setup.desc}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold">{tab.setup.price}</span>
                <span className="text-stone-400 ml-1">FCFA</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {tab.setup.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-stone-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-center text-xs text-stone-600 mt-3">
            QR codes physiques (autocollants, chevalets) disponibles en option
          </p>
        </div>
      </div>

      {/* Plans */}
      <h3 className="text-center text-xl font-bold mb-3">Abonnement</h3>
      <p className="text-center text-sm text-emerald-400 font-semibold mb-8">
        1er mois offert pour toutes les formules
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {tab.plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl p-6 flex flex-col ${
              plan.popular
                ? "border-2 border-[#C8963E] bg-[#722F37]/80 shadow-xl shadow-[#722F37]/20"
                : "border border-stone-800 bg-[#722F37]/40"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C8963E] to-[#a07832] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Populaire
              </div>
            )}
            <h3 className="font-bold text-xl">{plan.name}</h3>
            <p className="text-sm text-stone-500 mt-1">{plan.desc}</p>
            <p className="text-sm text-stone-500 mt-1 mb-4">
              Jusqu&apos;à {plan.capacity}
            </p>

            <div className="space-y-2 mb-5">
              {plan.prices.map((p) => (
                <div
                  key={p.duration}
                  className="flex items-center justify-between rounded-xl bg-stone-800/50 px-4 py-2.5"
                >
                  <span className="text-sm text-stone-300 font-medium">{p.duration}</span>
                  <div className="text-right">
                    <span className="font-bold text-white">{p.price}</span>
                    <span className="text-stone-400 text-xs ml-1">FCFA</span>
                    {p.perMonth && (
                      <span className="block text-[11px] text-emerald-400">
                        soit {p.perMonth} / mois
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <ul className="space-y-2.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-stone-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                plan.popular
                  ? "bg-gradient-to-b from-[#C8963E] to-[#a07832] text-white shadow-lg shadow-[#722F37]/30 hover:from-[#d4a94e] hover:to-[#C8963E]"
                  : "border border-stone-700 text-stone-200 hover:bg-[#5a2530]"
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
