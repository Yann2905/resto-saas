export const dynamic = "force-static";

import { Users, Target, Heart, MapPin } from "lucide-react";

export default function APropos() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-10 mb-4">
        À propos de Resto SaaS
      </h1>
      <p className="text-lg text-stone-400 leading-relaxed mb-12 max-w-2xl">
        Nous aidons les restaurants en Côte d&apos;Ivoire à moderniser leur
        service avec une solution de commande digitale simple, accessible et
        efficace.
      </p>

      <div className="space-y-16">
        {/* Mission */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold">Notre mission</h2>
          </div>
          <p className="text-stone-300 leading-relaxed">
            Rendre la technologie accessible aux restaurants de toutes tailles
            en Côte d&apos;Ivoire. Du petit maquis au grand restaurant, chaque
            établissement mérite des outils modernes pour mieux servir ses
            clients. Nous croyons que la digitalisation ne doit pas être
            réservée aux grandes chaînes — elle doit être simple, abordable et
            utile dès le premier jour.
          </p>
        </section>

        {/* Comment ça a commencé */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold">Notre histoire</h2>
          </div>
          <p className="text-stone-300 leading-relaxed">
            Resto SaaS est né d&apos;un constat simple : dans beaucoup de
            restaurants en Côte d&apos;Ivoire, la prise de commande se fait
            encore de manière traditionnelle — avec les oublis, les erreurs et
            les temps d&apos;attente que cela implique. Nous avons voulu créer
            une solution qui élimine ces problèmes sans complexité.
          </p>
          <p className="text-stone-300 leading-relaxed mt-3">
            Aujourd&apos;hui, nos restaurants partenaires reçoivent leurs
            commandes en temps réel, gèrent leur équipe de serveurs depuis leur
            téléphone et ont une vue claire sur leurs ventes — le tout sans
            matériel supplémentaire.
          </p>
        </section>

        {/* Ce qui nous différencie */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold">
              Ce qui nous différencie
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Service clé en main",
                desc: "On configure tout pour vous : ajout du menu, photos des plats, création des comptes serveurs, QR codes. Vous n'avez rien à faire.",
              },
              {
                title: "Pensé pour la Côte d'Ivoire",
                desc: "Paiement Mobile Money, interface en français, tarifs adaptés au marché local, support WhatsApp direct.",
              },
              {
                title: "Pas d'app à installer",
                desc: "Vos clients commandent directement depuis leur navigateur. Aucun téléchargement requis — il suffit de scanner le QR code.",
              },
              {
                title: "Support humain",
                desc: "Pas de chatbot, pas de ticket. Vous nous écrivez sur WhatsApp, on vous répond. C'est aussi simple que ça.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-800 bg-stone-900/40 p-5"
              >
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Localisation */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold">Où nous trouver</h2>
          </div>
          <p className="text-stone-300 leading-relaxed">
            Resto SaaS est basé à Daloa, Côte d&apos;Ivoire. Nous accompagnons
            des restaurants dans toute la Côte d&apos;Ivoire — Daloa, Abidjan,
            Yamoussoukro, Bouaké et au-delà.
          </p>
          <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
            <p className="text-stone-300 text-sm space-y-1">
              <span className="block">
                <strong className="text-white">WhatsApp :</strong>{" "}
                <a
                  href="https://wa.me/2250575343846"
                  className="text-amber-400 hover:text-amber-300"
                >
                  +225 05 75 34 38 46
                </a>
              </span>
              <span className="block">
                <strong className="text-white">Email :</strong>{" "}
                <a
                  href="mailto:contact@resto-saas.com"
                  className="text-amber-400 hover:text-amber-300"
                >
                  contact@resto-saas.com
                </a>
              </span>
              <span className="block">
                <strong className="text-white">Horaires :</strong> Lundi —
                Samedi, 8h — 20h
              </span>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
