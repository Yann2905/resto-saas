export const dynamic = "force-static";

import Link from "next/link";
import {
  QrCode,
  Zap,
  BarChart3,
  Shield,
  Bell,
  Smartphone,
  Check,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Users,
  Star,
  Clock,
  Package,
} from "lucide-react";

const FEATURES = [
  {
    Icon: QrCode,
    title: "QR codes par table",
    desc: "Chaque table a son QR code. Le client scanne et commande sans attendre.",
  },
  {
    Icon: Bell,
    title: "Alertes sonores × 3",
    desc: "Un son puissant se répète 3 fois + vibration mobile. Impossible de rater une commande.",
  },
  {
    Icon: Users,
    title: "Gestion des serveurs",
    desc: "Chaque serveur a son compte et ses tables. Il reçoit uniquement ses commandes.",
  },
  {
    Icon: Smartphone,
    title: "App installable (PWA)",
    desc: "Vos serveurs installent l'app sur leur téléphone. Notifications même app fermée.",
  },
  {
    Icon: BarChart3,
    title: "Statistiques détaillées",
    desc: "Chiffre d'affaires, top produits, heures de pointe. Jour par jour ou par période.",
  },
  {
    Icon: Shield,
    title: "Code PIN sécurisé",
    desc: "Le serveur gère les commandes mais ne peut pas modifier le menu ni voir les stats.",
  },
  {
    Icon: Zap,
    title: "Gestion de stock",
    desc: "Stock en temps réel. Produits épuisés automatiquement masqués pour les clients.",
  },
  {
    Icon: Clock,
    title: "Suivi client en direct",
    desc: "Le client voit l'état de sa commande en temps réel : prise en charge, en préparation, prête.",
  },
  {
    Icon: Package,
    title: "Menu toujours à jour",
    desc: "Modifiez vos plats, prix et photos en 2 clics. Fini les menus papier périmés.",
  },
];

const PLANS = [
  {
    name: "Starter",
    prices: [
      { duration: "1 mois", price: "10 000", perMonth: null },
      { duration: "6 mois", price: "50 000", perMonth: "8 300" },
      { duration: "1 an", price: "90 000", perMonth: "7 500" },
    ],
    desc: "Idéal pour les petits restaurants et maquis",
    tables: "10",
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
    tables: "30",
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
    tables: "200",
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
];

const SETUP_OPTIONS = [
  {
    name: "Installation",
    price: "15 000",
    desc: "On s'occupe de tout, vous n'avez rien à faire",
    items: [
      "Configuration complète du restaurant",
      "Ajout de toutes les photos du menu",
      "Création des comptes serveurs",
      "Formation personnalisée",
      "QR codes en fichier PDF",
    ],
  },
];

const TESTIMONIAL = {
  quote:
    "Depuis qu'on utilise Resto SaaS, mes clients n'attendent plus pour commander. Le service est plus rapide et mes serveurs sont mieux organisés.",
  author: "Restaurateur",
  city: "Daloa",
};

export default function Home() {
  const whatsappUrl =
    "https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20restaurant.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.2),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.1),_transparent_50%)]" />

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 shadow-lg shadow-amber-900/30">
            R
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-950" />
          </div>
          <span className="font-semibold tracking-tight text-lg">
            Resto SaaS
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="#fonctionnement"
            className="hidden sm:inline text-sm text-stone-400 hover:text-white transition-colors"
          >
            Comment ça marche
          </a>
          <a
            href="#fonctionnalites"
            className="hidden sm:inline text-sm text-stone-400 hover:text-white transition-colors"
          >
            Fonctionnalités
          </a>
          <a
            href="#tarifs"
            className="hidden sm:inline text-sm text-stone-400 hover:text-white transition-colors"
          >
            Tarifs
          </a>
          <Link
            href="/dashboard/login"
            className="text-sm font-semibold text-stone-300 hover:text-white transition-colors flex items-center gap-1"
          >
            Connexion <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-28 md:pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/60 px-4 py-1.5 text-xs font-medium text-stone-300 backdrop-blur mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Utilisé par des restaurants en Côte d&apos;Ivoire
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Vos clients scannent.
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Vous servez plus vite.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-stone-400 max-w-2xl leading-relaxed">
            QR code sur chaque table, menu digital toujours à jour, commandes
            en temps réel avec notification sonore sur le téléphone de chaque
            serveur. Sans app à télécharger pour vos clients.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-semibold px-7 py-4 shadow-lg shadow-amber-900/40 hover:from-amber-300 hover:to-amber-500 transition-all text-base"
            >
              Démarrer maintenant
              <ChevronRight className="w-5 h-5" />
            </a>
            <a
              href="#fonctionnement"
              className="inline-flex items-center justify-center rounded-full border border-stone-700 bg-stone-900/40 backdrop-blur px-7 py-4 font-medium text-stone-200 hover:bg-stone-800 transition-colors"
            >
              Voir comment ça marche
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Installation : 15 000 FCFA
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              On configure tout pour vous
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Opérationnel en 24h
            </span>
          </div>
        </div>
      </section>

      {/* ── Social proof ────────────────────────────────── */}
      <section className="relative z-10 border-t border-stone-900/50 py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-5 h-5 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
          <blockquote className="text-lg md:text-xl text-stone-300 italic leading-relaxed">
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-stone-500">
            — {TESTIMONIAL.author}, {TESTIMONIAL.city}
          </p>
        </div>
      </section>

      {/* ── Comment ça marche ───────────────────────────── */}
      <section
        id="fonctionnement"
        className="relative z-10 border-t border-stone-900/50 py-20 md:py-28"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-amber-400 font-semibold text-sm tracking-wide uppercase mb-3">
              Simple et rapide
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Opérationnel en 3 étapes
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Vous nous contactez, on fait tout le reste. Votre restaurant est
              en ligne en moins de 24 heures.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Contactez-nous",
                desc: "Envoyez-nous le nom de votre restaurant, votre menu (photos + prix) et le nombre de tables. C'est tout ce qu'on a besoin.",
              },
              {
                step: "2",
                title: "On configure tout",
                desc: "On crée votre compte, on ajoute vos plats avec les photos, on génère vos QR codes. Vous n'avez rien à faire.",
              },
              {
                step: "3",
                title: "Les commandes arrivent",
                desc: "Vos clients scannent le QR code, commandent depuis leur téléphone. Chaque serveur reçoit sa commande instantanément.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-2xl mb-5 shadow-lg shadow-amber-900/20">
                  {s.step}
                </div>
                <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                <p className="text-stone-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ─────────────────────────────── */}
      <section
        id="fonctionnalites"
        className="relative z-10 border-t border-stone-900/50 py-20 md:py-28"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-amber-400 font-semibold text-sm tracking-wide uppercase mb-3">
              Fonctionnalités
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Tout ce qu&apos;il faut pour votre restaurant
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Une solution complète pensée pour les restaurants en Côte
              d&apos;Ivoire.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-stone-800 bg-stone-900/40 backdrop-blur p-6 hover:border-amber-600/40 hover:bg-stone-900/70 transition-all"
              >
                <f.Icon className="w-8 h-8 mb-4 text-amber-400" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs — Installation ───────────────────────── */}
      <section
        id="tarifs"
        className="relative z-10 border-t border-stone-900/50 py-20 md:py-28"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-amber-400 font-semibold text-sm tracking-wide uppercase mb-3">
              Tarifs
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Des prix clairs, sans surprise
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Un frais d&apos;installation unique + un abonnement mensuel.
              Paiement via Mobile Money.
            </p>
          </div>

          {/* Installation */}
          <div className="mb-20">
            <h3 className="text-center text-xl font-bold mb-8">
              Frais d&apos;installation{" "}
              <span className="text-stone-500 font-normal">(une seule fois)</span>
            </h3>
            <div className="max-w-md mx-auto">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg">Installation</h4>
                    <p className="text-sm text-stone-500 mt-1">On s&apos;occupe de tout, vous n&apos;avez rien à faire</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold">15 000</span>
                    <span className="text-stone-400 ml-1">FCFA</span>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {SETUP_OPTIONS[0].items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-stone-300"
                    >
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

          {/* Abonnements */}
          <h3 className="text-center text-xl font-bold mb-3">
            Abonnement
          </h3>
          <p className="text-center text-sm text-emerald-400 font-semibold mb-8">
            1er mois offert pour toutes les formules
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.popular
                    ? "border-2 border-amber-500 bg-stone-900/80 shadow-xl shadow-amber-900/20"
                    : "border border-stone-800 bg-stone-900/40"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Populaire
                  </div>
                )}
                <h4 className="font-bold text-xl">{plan.name}</h4>
                <p className="text-sm text-stone-500 mt-1">{plan.desc}</p>
                <p className="text-sm text-stone-500 mt-1 mb-4">
                  Jusqu&apos;à {plan.tables} tables
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
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-stone-300"
                    >
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
                      ? "bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 shadow-lg shadow-amber-900/30 hover:from-amber-300 hover:to-amber-500"
                      : "border border-stone-700 text-stone-200 hover:bg-stone-800"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ rapide ──────────────────────────────────── */}
      <section className="relative z-10 border-t border-stone-900/50 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-amber-400 font-semibold text-sm tracking-wide uppercase mb-3">
              Questions fréquentes
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Vous avez des questions ?
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "Mes clients doivent télécharger une application ?",
                a: "Non. Le client scanne le QR code avec l'appareil photo de son téléphone et le menu s'affiche directement dans son navigateur. Aucune app à installer.",
              },
              {
                q: "Et si un serveur est absent ou malade ?",
                a: "Le propriétaire peut réassigner les tables d'un serveur absent à un autre en 2 clics depuis la page Équipe. Les commandes seront dirigées vers le nouveau serveur.",
              },
              {
                q: "Comment je reçois les commandes si l'app est fermée ?",
                a: "Vos serveurs installent l'app sur leur téléphone (PWA). Ils reçoivent une notification push même quand l'app est fermée, comme WhatsApp.",
              },
              {
                q: "Je peux changer de formule en cours de route ?",
                a: "Oui, vous pouvez passer d'un plan à un autre à tout moment. Contactez-nous sur WhatsApp et c'est réglé dans la journée.",
              },
              {
                q: "Quel matériel me faut-il ?",
                a: "Juste un téléphone ou une tablette avec internet. Pas besoin de caisse enregistreuse, d'imprimante ticket ou de matériel spécial.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6"
              >
                <h4 className="font-semibold text-base mb-2">{faq.q}</h4>
                <p className="text-sm text-stone-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────── */}
      <section className="relative z-10 border-t border-stone-900/50 py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Prêt à digitaliser votre restaurant ?
          </h2>
          <p className="text-stone-400 mb-8 text-lg leading-relaxed">
            Contactez-nous sur WhatsApp. On configure tout pour vous en moins
            de 24 heures.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-stone-950 font-semibold px-8 py-4 shadow-lg shadow-emerald-900/40 hover:from-emerald-300 hover:to-emerald-500 transition-all text-base"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              aria-hidden
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Nous contacter sur WhatsApp
          </a>
          <p className="mt-4 text-xs text-stone-600">
            Disponible du lundi au samedi, 8h - 20h
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-stone-900 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-sm">
                  R
                </div>
                <span className="font-semibold text-sm">Resto SaaS</span>
              </div>
              <p className="text-xs text-stone-500 max-w-xs">
                Solution de commande digitale par QR code pour les restaurants
                en Côte d&apos;Ivoire.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-stone-300 mb-2">Produit</h4>
                <ul className="space-y-1.5 text-stone-500">
                  <li>
                    <a href="#fonctionnalites" className="hover:text-stone-300 transition-colors">
                      Fonctionnalités
                    </a>
                  </li>
                  <li>
                    <a href="#tarifs" className="hover:text-stone-300 transition-colors">
                      Tarifs
                    </a>
                  </li>
                  <li>
                    <Link href="/dashboard/login" className="hover:text-stone-300 transition-colors">
                      Espace restaurant
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-stone-300 mb-2">Entreprise</h4>
                <ul className="space-y-1.5 text-stone-500">
                  <li>
                    <Link href="/a-propos" className="hover:text-stone-300 transition-colors">
                      À propos
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="hover:text-stone-300 transition-colors">
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-stone-300 mb-2">Légal</h4>
                <ul className="space-y-1.5 text-stone-500">
                  <li>
                    <Link href="/cgu" className="hover:text-stone-300 transition-colors">
                      CGU
                    </Link>
                  </li>
                  <li>
                    <Link href="/confidentialite" className="hover:text-stone-300 transition-colors">
                      Confidentialité
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-600">
              © {new Date().getFullYear()} Resto SaaS — Daloa, Côte d&apos;Ivoire
            </span>
            <a
              href="https://wa.me/2250575343846"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-500 hover:text-emerald-400 transition-colors"
            >
              WhatsApp : +225 05 75 34 38 46
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
