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
} from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.15),_transparent_50%)]" />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 shadow-lg shadow-amber-900/30">
            R
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-950" />
          </div>
          <span className="font-semibold tracking-tight text-lg">Resto SaaS</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#tarifs" className="hidden sm:inline text-sm text-stone-400 hover:text-white transition-colors">
            Tarifs
          </a>
          <a href="#fonctionnement" className="hidden sm:inline text-sm text-stone-400 hover:text-white transition-colors">
            Comment ça marche
          </a>
          <Link
            href="/dashboard/login"
            className="text-sm font-semibold text-stone-300 hover:text-white transition-colors flex items-center gap-1"
          >
            Connexion <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-28 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/60 px-4 py-1.5 text-xs font-medium text-stone-300 backdrop-blur mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            14 jours d&apos;essai gratuit · Sans engagement
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Vos clients scannent.
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Vous servez plus vite.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-stone-400 max-w-2xl leading-relaxed">
            Un QR code par table, un menu digital toujours à jour, des
            commandes qui arrivent en temps réel avec signal sonore.
            Sans app à installer, sans matériel à acheter.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a
              href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20restaurant."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-semibold px-7 py-4 shadow-lg shadow-amber-900/40 hover:from-amber-300 hover:to-amber-500 transition-all text-base"
            >
              Essayer gratuitement
              <ChevronRight className="w-5 h-5" />
            </a>
            <a
              href="#fonctionnement"
              className="inline-flex items-center justify-center rounded-full border border-stone-700 bg-stone-900/40 backdrop-blur px-7 py-4 font-medium text-stone-200 hover:bg-stone-800 transition-colors"
            >
              Comment ça marche ?
            </a>
          </div>

          <p className="mt-5 text-xs text-stone-500">
            À partir de 5 000 FCFA/mois · Aucun frais caché
          </p>
        </div>
      </section>

      {/* ── Comment ça marche ───────────────────────────────── */}
      <section id="fonctionnement" className="relative z-10 border-t border-stone-900/50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Opérationnel en 3 étapes
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Pas de formation, pas d&apos;installation compliquée. Votre restaurant est en ligne en quelques minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "On crée votre compte",
                desc: "Vous nous envoyez le nom de votre restaurant, votre menu et le nombre de tables. On configure tout pour vous.",
              },
              {
                step: "2",
                title: "Imprimez vos QR codes",
                desc: "Téléchargez vos QR codes depuis votre tableau de bord et faites-les imprimer en autocollants pour vos tables.",
              },
              {
                step: "3",
                title: "Les commandes arrivent",
                desc: "Vos clients scannent, commandent depuis leur téléphone. Vous recevez un signal sonore instantanément.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-xl mb-5 shadow-lg shadow-amber-900/20">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ─────────────────────────────────── */}
      <section className="relative z-10 border-t border-stone-900/50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Tout ce qu&apos;il faut pour votre restaurant
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                Icon: QrCode,
                title: "QR codes par table",
                desc: "Chaque table a son QR code. Le client scanne et commande sans attendre le serveur.",
              },
              {
                Icon: Bell,
                title: "Signal sonore en temps réel",
                desc: "Un son vous alerte dès qu'une commande arrive, même si vous n'êtes pas sur la page commandes.",
              },
              {
                Icon: Smartphone,
                title: "Menu digital responsive",
                desc: "Votre menu s'affiche parfaitement sur tout téléphone. Photos, prix, stock en temps réel.",
              },
              {
                Icon: BarChart3,
                title: "Statistiques détaillées",
                desc: "Chiffre d'affaires, top produits, heures de pointe. Jour par jour ou par période.",
              },
              {
                Icon: Shield,
                title: "Code PIN sécurisé",
                desc: "Protégez vos données : le serveur gère les commandes mais ne peut pas modifier le menu ni voir les stats.",
              },
              {
                Icon: Zap,
                title: "Gestion de stock",
                desc: "Suivi du stock en temps réel. Les produits épuisés sont automatiquement marqués pour les clients.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-stone-800 bg-stone-900/40 backdrop-blur p-6 hover:border-amber-600/40 hover:bg-stone-900/70 transition-all"
              >
                <f.Icon className="w-8 h-8 mb-4 text-amber-400" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs ──────────────────────────────────────────── */}
      <section id="tarifs" className="relative z-10 border-t border-stone-900/50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Des tarifs simples et accessibles
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Un seul plan, toutes les fonctionnalités incluses. Plus vous prenez longtemps, plus c&apos;est avantageux.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { label: "1 mois", price: "5 000", perMonth: "5 000", saving: null },
              { label: "3 mois", price: "12 000", perMonth: "4 000", saving: "3 000", popular: true },
              { label: "5 mois", price: "20 000", perMonth: "4 000", saving: "5 000" },
            ].map((p) => (
              <div
                key={p.label}
                className={`relative rounded-2xl p-6 text-center ${
                  p.popular
                    ? "border-2 border-amber-500 bg-stone-900/80 shadow-xl shadow-amber-900/20"
                    : "border border-stone-800 bg-stone-900/40"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-stone-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Populaire
                  </div>
                )}
                <h3 className="text-lg font-bold mt-1">{p.label}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className="text-stone-400 ml-1">FCFA</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">
                  soit {p.perMonth} FCFA / mois
                </p>
                {p.saving && (
                  <p className="text-sm text-emerald-400 font-semibold mt-1">
                    Économisez {p.saving} FCFA
                  </p>
                )}
                <ul className="mt-5 space-y-2 text-sm text-stone-300 text-left">
                  {[
                    "Commandes en temps réel",
                    "QR codes illimités",
                    "Statistiques complètes",
                    "Stock & menu digital",
                    "Signal sonore",
                    "Code PIN sécurité",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-stone-500 text-sm mb-4">
              14 jours d&apos;essai gratuit à la création · Paiement via Mobile Money
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="relative z-10 border-t border-stone-900/50 py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Prêt à digitaliser votre restaurant ?
          </h2>
          <p className="text-stone-400 mb-8 text-lg">
            Contactez-nous sur WhatsApp pour démarrer votre essai gratuit de 14 jours. Configuration en moins de 24h.
          </p>
          <a
            href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20restaurant."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-stone-950 font-semibold px-8 py-4 shadow-lg shadow-emerald-900/40 hover:from-emerald-300 hover:to-emerald-500 transition-all text-base"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Nous contacter sur WhatsApp
          </a>
          <p className="mt-4 text-xs text-stone-600">
            Disponible du lundi au samedi, 8h - 20h
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-stone-900 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-sm">
              R
            </div>
            <span className="text-sm text-stone-500">
              © {new Date().getFullYear()} Resto SaaS — Daloa, Côte d&apos;Ivoire
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-600">
            <Link href="/dashboard/login" className="hover:text-stone-300 transition-colors">
              Espace restaurant
            </Link>
            <Link href="/admin/login" className="hover:text-stone-300 transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
