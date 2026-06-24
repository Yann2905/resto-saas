import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <nav className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-stone-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-stone-950 text-sm">
            R
          </div>
          <span className="font-semibold tracking-tight">Resto SaaS</span>
        </div>
      </nav>
      <article className="max-w-4xl mx-auto px-6 pb-20">{children}</article>
      <footer className="border-t border-stone-900 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-600">
          <Link href="/cgu" className="hover:text-stone-300 transition-colors">
            CGU
          </Link>
          <Link
            href="/confidentialite"
            className="hover:text-stone-300 transition-colors"
          >
            Confidentialité
          </Link>
          <Link
            href="/a-propos"
            className="hover:text-stone-300 transition-colors"
          >
            À propos
          </Link>
          <Link
            href="/contact"
            className="hover:text-stone-300 transition-colors"
          >
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
