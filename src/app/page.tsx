import Link from "next/link";
import { Boxes, QrCode, Zap, type LucideIcon } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.15),_transparent_50%)]" />

      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950">
            R
          </div>
          <span className="font-semibold tracking-tight">Resto SaaS</span>
        </div>
        <Link
          href="/dashboard/login"
          className="text-sm text-stone-300 hover:text-white transition-colors"
        >
          Connexion →
        </Link>
      </nav>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-28 md:pb-32">
        <div className="max-w-3xl animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/60 px-4 py-1.5 text-xs font-medium text-stone-300 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Commande digitale nouvelle génération
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Vos clients commandent.
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Vous servez plus vite.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-stone-400 max-w-2xl leading-relaxed">
            Un QR code par table, un menu digital toujours à jour, des
            commandes qui arrivent directement en cuisine. Sans installation,
            sans friction.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-semibold px-7 py-4 shadow-lg shadow-amber-900/40 hover:from-amber-300 hover:to-amber-500 transition-all"
            >
              Accéder à mon restaurant
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-stone-700 bg-stone-900/40 backdrop-blur px-7 py-4 font-medium text-stone-200 hover:bg-stone-800 transition-colors"
            >
              Découvrir
            </a>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 max-w-6xl mx-auto px-6 pb-24"
      >
        <div className="grid md:grid-cols-3 gap-4">
          {([
            {
              title: "QR code par table",
              desc: "Vos clients scannent et accèdent instantanément à votre menu, sans app à installer.",
              Icon: QrCode,
            },
            {
              title: "Temps réel en cuisine",
              desc: "Chaque commande arrive avec un signal sonore. Statut mis à jour en un tap.",
              Icon: Zap,
            },
            {
              title: "Stock & indisponibilité",
              desc: "Décrément atomique du stock. Fini les commandes de plats épuisés.",
              Icon: Boxes,
            },
          ] as Array<{ title: string; desc: string; Icon: LucideIcon }>).map(
            (f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-stone-800 bg-stone-900/40 backdrop-blur p-6 hover:border-amber-600/50 hover:bg-stone-900/70 transition-all"
              >
                <f.Icon className="w-8 h-8 mb-4 text-amber-400" aria-hidden />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      <footer className="relative z-10 border-t border-stone-900 py-8">
        <div className="max-w-6xl mx-auto px-6 text-xs text-stone-500">
          © {new Date().getFullYear()} Resto SaaS — Commande digitale pour
          restaurants.
        </div>
      </footer>
    </main>
  );
}
