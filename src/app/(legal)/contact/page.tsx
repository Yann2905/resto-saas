export const dynamic = "force-static";

import { MessageCircle, Mail, Clock, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-10 mb-4">
        Contactez-nous
      </h1>
      <p className="text-lg text-stone-400 leading-relaxed mb-12 max-w-2xl">
        Une question, un besoin, une démonstration ? On est là pour vous aider.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <a
          href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20avoir%20des%20informations%20sur%20Resto%20SaaS."
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-stone-800 bg-stone-900/40 p-6 hover:border-emerald-600/40 hover:bg-stone-900/70 transition-all"
        >
          <MessageCircle className="w-8 h-8 mb-4 text-emerald-400" />
          <h3 className="font-semibold text-lg mb-1">WhatsApp</h3>
          <p className="text-sm text-stone-400 mb-3">
            Le moyen le plus rapide de nous joindre
          </p>
          <span className="text-amber-400 font-medium text-sm group-hover:text-amber-300">
            +225 05 75 34 38 46
          </span>
        </a>

        <a
          href="mailto:contact@resto-saas.com"
          className="group rounded-2xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/40 hover:bg-stone-900/70 transition-all"
        >
          <Mail className="w-8 h-8 mb-4 text-amber-400" />
          <h3 className="font-semibold text-lg mb-1">Email</h3>
          <p className="text-sm text-stone-400 mb-3">
            Pour les demandes détaillées
          </p>
          <span className="text-amber-400 font-medium text-sm group-hover:text-amber-300">
            contact@resto-saas.com
          </span>
        </a>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
          <Clock className="w-6 h-6 mb-3 text-stone-500" />
          <h3 className="font-semibold mb-1">Horaires</h3>
          <p className="text-sm text-stone-400">
            Lundi — Samedi
            <br />
            8h00 — 20h00
          </p>
        </div>

        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
          <MapPin className="w-6 h-6 mb-3 text-stone-500" />
          <h3 className="font-semibold mb-1">Localisation</h3>
          <p className="text-sm text-stone-400">
            Daloa, Côte d&apos;Ivoire
            <br />
            Service disponible dans toute la CI
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-8 text-center">
        <h3 className="font-semibold text-xl mb-2">
          Vous êtes restaurateur ?
        </h3>
        <p className="text-stone-400 mb-6 max-w-lg mx-auto">
          Envoyez-nous un message sur WhatsApp avec le nom de votre restaurant
          et le nombre de tables. On vous configure tout en moins de 24h.
        </p>
        <a
          href="https://wa.me/2250575343846?text=Bonjour%2C%20je%20suis%20restaurateur%20et%20je%20souhaite%20essayer%20Resto%20SaaS."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-stone-950 font-semibold px-8 py-3.5 shadow-lg shadow-emerald-900/40 hover:from-emerald-300 hover:to-emerald-500 transition-all"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 fill-current"
            aria-hidden
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Démarrer sur WhatsApp
        </a>
      </div>
    </>
  );
}
