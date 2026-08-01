import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, X } from "lucide-react";
import { formatFCFA } from "@/lib/format";

export const metadata = {
  title: "Nos tarifs — Resto SaaS",
  description: "Découvrez les plans Starter, Pro et Business de Resto SaaS pour gérer votre restaurant en Côte d'Ivoire.",
};

const TIERS = [
  {
    name: "Starter",
    price: 10000,
    description: "Pour démarrer la digitalisation de votre restaurant",
    features: [
      { label: "Menu digital + QR codes", included: true },
      { label: "Commandes sur place", included: true },
      { label: "Notifications sonores", included: true },
      { label: "Jusqu'à 10 tables", included: true },
      { label: "Gestion du stock", included: true },
      { label: "Statistiques de base", included: true },
      { label: "Commandes en livraison", included: false },
      { label: "Caisse enregistreuse", included: false },
      { label: "Gestion des serveurs", included: false },
      { label: "Notifications push", included: false },
      { label: "Statistiques avancées", included: false },
    ],
  },
  {
    name: "Pro",
    price: 15000,
    popular: true,
    description: "La solution complète pour les restaurants actifs",
    features: [
      { label: "Tout le plan Starter", included: true },
      { label: "Commandes en livraison", included: true },
      { label: "Caisse enregistreuse + rapport Z", included: true },
      { label: "Gestion des serveurs", included: true },
      { label: "Notifications push", included: true },
      { label: "Statistiques avancées", included: true },
      { label: "Sorties de caisse", included: true },
      { label: "Tables configurables", included: true },
      { label: "Support multi-sites", included: false },
      { label: "API personnalisée", included: false },
    ],
  },
  {
    name: "Business",
    price: 30000,
    description: "Pour les grands établissements et chaînes",
    features: [
      { label: "Tout le plan Pro", included: true },
      { label: "Multi-sites / chaînes", included: true },
      { label: "Tables illimitées", included: true },
      { label: "Support prioritaire", included: true },
      { label: "Accompagnement dédié", included: true },
    ],
  },
];

export default function PrixPage() {
  return (
    <main className="min-h-screen bg-[#FFF8F0]">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Image src="/icon-192.png" alt="Resto SaaS" width={56} height={56} className="rounded-2xl shadow-md" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
            Nos tarifs
          </h1>
          <p className="text-stone-500 max-w-lg mx-auto">
            Des plans simples et transparents. Essai gratuit de 14 jours sur tous les plans, sans engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white rounded-3xl border-2 p-6 flex flex-col ${
                tier.popular
                  ? "border-[#722F37] shadow-xl shadow-[#722F37]/10"
                  : "border-stone-200"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#722F37] text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  Populaire
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-xl font-bold text-stone-900">{tier.name}</h2>
                <p className="text-xs text-stone-500 mt-1">{tier.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-stone-900">
                    {formatFCFA(tier.price)}
                  </span>
                  <span className="text-sm text-stone-400">/mois</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Économisez jusqu&apos;à 25% avec un abonnement annuel
                </p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-stone-300 mt-0.5 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        f.included ? "text-stone-700" : "text-stone-400"
                      }`}
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20le%20plan%20${encodeURIComponent(tier.name)}"
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center rounded-2xl font-bold py-3 text-sm transition-colors ${
                  tier.popular
                    ? "bg-[#722F37] text-white hover:bg-[#5a2530] shadow-lg shadow-[#722F37]/20"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                Commencer l&apos;essai gratuit
              </a>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 text-center">
          <h3 className="text-lg font-bold text-stone-900 mb-2">
            Vous avez des questions ?
          </h3>
          <p className="text-sm text-stone-500 mb-5">
            Contactez-nous sur WhatsApp, on vous répond en moins de 24h.
          </p>
          <a
            href="https://wa.me/2250575343846"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white font-semibold px-6 py-3 text-sm hover:bg-emerald-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Nous contacter
          </a>
        </div>
      </div>
    </main>
  );
}
