import Link from "next/link";
import Image from "next/image";
import PricingTabs from "./_components/pricing-tabs";
import MobileNav from "./_components/mobile-nav";
import HomeMarketplace from "./_components/home-marketplace";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { RestaurantRow, ProductRow, mapRestaurant, mapProduct } from "@/types";
import { isSubscriptionActive } from "@/lib/restaurants-server";
import {
  QrCode,
  Zap,
  BarChart3,
  Shield,
  Bell,
  Smartphone,
  Check,
  ChevronRight,
  Users,
  Clock,
  Package,
  Truck,
  CreditCard,
  Home,
  Star,
} from "lucide-react";

export const revalidate = 60;

const FEATURES = [
  {
    Icon: QrCode,
    title: "QR codes par table",
    desc: "Chaque table a son QR code. Le client scanne et commande sans attendre de serveur.",
  },
  {
    Icon: Truck,
    title: "Livraison à domicile",
    desc: "Vos clients commandent depuis chez eux. Ils choisissent leur quartier et reçoivent leur commande.",
  },
  {
    Icon: CreditCard,
    title: "Caisse enregistreuse",
    desc: "Encaissez les commandes sur place directement depuis le dashboard. Rapide et simple.",
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
    Icon: Home,
    title: "Mode hôtel",
    desc: "Room service intégré. Les clients commandent depuis leur chambre via QR code.",
  },
  {
    Icon: Package,
    title: "Menu toujours à jour",
    desc: "Modifiez vos plats, prix et photos en 2 clics. Fini les menus papier périmés.",
  },
];

const TESTIMONIAL = {
  quote:
    "Depuis qu'on utilise Resto SaaS, mes clients n'attendent plus pour commander. Le service est plus rapide et mes serveurs sont mieux organisés.",
  author: "Restaurateur",
  city: "Daloa",
};

export default async function HomePage() {
  const whatsappUrl =
    "https://wa.me/2250575343846?text=Bonjour%2C%20je%20souhaite%20essayer%20Resto%20SaaS%20pour%20mon%20restaurant.";

  // Fetch marketplace data
  const supabase = createSupabaseAdminClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .eq("delivery_enabled", true);

  const activeRestaurants = ((restaurants as RestaurantRow[]) ?? [])
    .map(mapRestaurant)
    .filter(isSubscriptionActive);

  const restaurantIds = activeRestaurants.map((r) => r.id);

  let allProducts: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    description: string | null;
    restaurant: { id: string; slug: string; name: string; logoUrl: string | null; deliveryFee: number; address: string | null };
  }[] = [];

  if (restaurantIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("restaurant_id", restaurantIds)
      .eq("available", true)
      .order("created_at", { ascending: false });

    const restMap = new Map(activeRestaurants.map((r) => [r.id, r]));

    allProducts = ((products as ProductRow[]) ?? [])
      .map((p) => {
        const mapped = mapProduct(p);
        const rest = restMap.get(mapped.restaurantId);
        if (!rest) return null;
        return {
          id: mapped.id,
          name: mapped.name,
          price: mapped.price,
          imageUrl: mapped.imageUrl ?? null,
          description: mapped.description,
          restaurant: {
            id: rest.id,
            slug: rest.slug,
            name: rest.name,
            logoUrl: rest.logoUrl ?? null,
            deliveryFee: rest.deliveryFee,
            address: rest.address ?? null,
          },
        };
      })
      .filter(Boolean) as typeof allProducts;
  }

  const restaurantList = activeRestaurants.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: r.logoUrl ?? null,
    deliveryFee: r.deliveryFee,
    address: r.address ?? null,
  }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950 text-stone-100 pb-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(114,47,55,0.25),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(200,150,62,0.15),_transparent_50%)]" />

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Image src="/icon-192.png" alt="Resto SaaS" width={36} height={36} className="rounded-xl shadow-lg shadow-[#722F37]/30" priority />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-950" />
          </div>
          <span className="font-semibold tracking-tight text-lg">Resto SaaS</span>
        </div>
        <MobileNav />
      </nav>

      {/* ── Hero (compact) ─────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-6 md:pt-16 md:pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-[#722F37]/60 px-4 py-1.5 text-xs font-medium text-stone-300 backdrop-blur mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Livraison à domicile disponible
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Commandez.
            <br />
            <span className="bg-gradient-to-r from-[#d4a94e] via-[#C8963E] to-[#722F37] bg-clip-text text-transparent">
              On vous livre.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-stone-400 max-w-2xl leading-relaxed">
            Découvrez les menus des restaurants et commandez en livraison.
            Sur place ? Scannez le QR code sur votre table.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Livraison rapide
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Paiement à la livraison
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              Suivi en temps réel
            </span>
          </div>
        </div>
      </section>

      {/* ── Marketplace (order directly) ───────────────── */}
      <HomeMarketplace products={allProducts} restaurants={restaurantList} />

      {/* ── Social proof ────────────────────────────────── */}
      <section className="relative z-10 border-t border-[#722F37]/50 py-14">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#C8963E] text-[#C8963E]" />
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

      {/* ── Pour les restaurateurs (banner) ─────────────── */}
      <section className="relative z-10 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-r from-[#722F37] to-[#5a2530] border border-[#722F37] p-8 md:p-10 text-center">
            <p className="text-[#C8963E] font-semibold text-sm tracking-wide uppercase mb-3">
              Vous êtes restaurateur ?
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Digitalisez votre restaurant
            </h2>
            <p className="text-stone-400 max-w-lg mx-auto mb-6">
              QR codes, caisse enregistreuse, livraison, gestion d&apos;équipe — tout en une seule plateforme.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#C8963E] to-[#a07832] text-white font-semibold px-7 py-3.5 shadow-lg shadow-[#722F37]/40 hover:from-[#d4a94e] hover:to-[#C8963E] transition-all"
              >
                Démarrer maintenant
                <ChevronRight className="w-5 h-5" />
              </a>
              <a
                href="#fonctionnalites"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-600 px-7 py-3.5 font-medium text-stone-300 hover:bg-stone-800 transition-colors"
              >
                Voir les fonctionnalités
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ───────────────────────────── */}
      <section id="fonctionnement" className="relative z-10 border-t border-[#722F37]/50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C8963E] font-semibold text-sm tracking-wide uppercase mb-3">
              Simple et rapide
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Opérationnel en 3 étapes
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Vous nous contactez, on fait tout le reste. Votre restaurant est en ligne en moins de 24 heures.
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
                desc: "Vos clients commandent depuis leur table ou depuis chez eux. Chaque commande arrive instantanément sur votre dashboard.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C8963E] to-[#a07832] flex items-center justify-center font-bold text-white text-2xl mb-5 shadow-lg shadow-[#722F37]/20">
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
      <section id="fonctionnalites" className="relative z-10 border-t border-[#722F37]/50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C8963E] font-semibold text-sm tracking-wide uppercase mb-3">
              Fonctionnalités
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Tout ce qu&apos;il faut pour votre restaurant
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              QR codes, livraison, caisse enregistreuse, gestion d&apos;équipe — une solution complète.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-stone-800 bg-[#722F37]/40 backdrop-blur p-6 hover:border-[#a07832]/40 hover:bg-[#722F37]/70 transition-all">
                <f.Icon className="w-8 h-8 mb-4 text-[#C8963E]" />
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarifs ────────────────────────────────────── */}
      <section id="tarifs" className="relative z-10 border-t border-[#722F37]/50 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#C8963E] font-semibold text-sm tracking-wide uppercase mb-3">
              Tarifs
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Des prix clairs, sans surprise
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Un frais d&apos;installation unique + un abonnement mensuel. Paiement via Mobile Money.
            </p>
          </div>
          <PricingTabs />
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-[#722F37]/50 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#C8963E] font-semibold text-sm tracking-wide uppercase mb-3">
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
                q: "Comment fonctionne la livraison ?",
                a: "Le client commande depuis la page d'accueil de Resto SaaS, entre son quartier et numéro de téléphone. Vous recevez la commande sur votre dashboard avec toutes les infos de livraison.",
              },
              {
                q: "C'est quoi la caisse enregistreuse ?",
                a: "C'est un outil intégré au dashboard qui vous permet d'encaisser les clients sur place sans qu'ils passent par le QR code. Vous sélectionnez les plats, validez et c'est fait.",
              },
              {
                q: "Et si un serveur est absent ou malade ?",
                a: "Le propriétaire peut réassigner les tables d'un serveur absent à un autre en 2 clics depuis la page Équipe.",
              },
              {
                q: "Comment je reçois les commandes si l'app est fermée ?",
                a: "Vos serveurs installent l'app sur leur téléphone (PWA). Ils reçoivent une notification push même quand l'app est fermée, comme WhatsApp.",
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-stone-800 bg-[#722F37]/40 p-6">
                <h3 className="font-semibold text-base mb-2">{faq.q}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partenariat ─────────────────────────────────── */}
      <section className="relative z-10 border-t border-[#722F37]/50 py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#C8963E] font-semibold text-sm tracking-wide uppercase mb-3">
              Partenariat
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Devenez partenaire Resto SaaS
            </h2>
            <p className="mt-3 text-stone-400 max-w-xl mx-auto">
              Vous faites notre promotion, on vous fait un prix exclusif. Gagnant-gagnant.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-stone-800 bg-[#722F37]/40 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#C8963E]/20 text-[#C8963E] flex items-center justify-center text-sm font-bold">1</span>
                Ce que vous faites
              </h3>
              <ul className="space-y-3">
                {["Afficher le logo Resto SaaS dans votre établissement", "Publier sur vos réseaux sociaux (1x/mois minimum)", "Nous autoriser à utiliser votre nom comme référence", "Recommander Resto SaaS aux établissements que vous connaissez"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-300">
                    <Check className="w-4 h-4 text-[#C8963E] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-[#C8963E] bg-[#722F37]/60 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#C8963E]/20 text-[#C8963E] flex items-center justify-center text-sm font-bold">2</span>
                Ce que vous gagnez
              </h3>
              <ul className="space-y-3">
                {["Installation 100% gratuite (0 FCFA)", "-50% sur votre abonnement à vie", "Support WhatsApp prioritaire", "QR codes aux couleurs Resto SaaS"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="font-bold text-center mb-5">Prix partenaire (-50%)</h3>
            <div className="space-y-4">
              {[
                { cat: "Restaurant", plans: [
                  { plan: "Starter", normal: "10 000", partner: "5 000" },
                  { plan: "Pro", normal: "15 000", partner: "7 500" },
                  { plan: "Business", normal: "30 000", partner: "15 000" },
                ]},
                { cat: "Hôtel", plans: [
                  { plan: "Starter", normal: "15 000", partner: "7 500" },
                  { plan: "Pro", normal: "25 000", partner: "12 500" },
                  { plan: "Business", normal: "45 000", partner: "22 500" },
                ]},
                { cat: "Restaurant + Hôtel", plans: [
                  { plan: "Starter", normal: "20 000", partner: "10 000" },
                  { plan: "Pro", normal: "35 000", partner: "17 500" },
                  { plan: "Business", normal: "60 000", partner: "30 000" },
                ]},
              ].map((cat) => (
                <div key={cat.cat}>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 text-center">{cat.cat}</p>
                  <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
                    {cat.plans.map((p) => (
                      <div key={p.plan} className="text-center rounded-xl bg-stone-800/50 p-2.5">
                        <div className="text-xs text-stone-500 mb-1">{p.plan}</div>
                        <div className="text-xs text-stone-500 line-through">{p.normal}</div>
                        <div className="text-base font-bold text-[#C8963E]">{p.partner}</div>
                        <div className="text-[10px] text-stone-500">FCFA / mois</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#C8963E] to-[#a07832] text-white font-semibold px-7 py-4 shadow-lg shadow-[#722F37]/40 hover:from-[#d4a94e] hover:to-[#C8963E] transition-all text-base"
            >
              Devenir partenaire
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────── */}
      <section className="relative z-10 border-t border-[#722F37]/50 py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Prêt à digitaliser votre restaurant ?
          </h2>
          <p className="text-stone-400 mb-8 text-lg leading-relaxed">
            Contactez-nous sur WhatsApp. On configure tout pour vous en moins de 24 heures.
          </p>
          <a
            href={whatsappUrl}
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

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#722F37] py-10 mb-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image src="/icon-192.png" alt="Resto SaaS" width={28} height={28} className="rounded-lg" loading="lazy" />
                <span className="font-semibold text-sm">Resto SaaS</span>
              </div>
              <p className="text-xs text-stone-500 max-w-xs">
                Solution de commande digitale pour les restaurants et hôtels en Côte d&apos;Ivoire.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-stone-300 mb-2 text-sm">Produit</h3>
                <ul className="space-y-1.5 text-stone-500">
                  <li><a href="#fonctionnalites" className="hover:text-stone-300 transition-colors">Fonctionnalités</a></li>
                  <li><a href="#tarifs" className="hover:text-stone-300 transition-colors">Tarifs</a></li>
                  <li><Link href="/dashboard/login" className="hover:text-stone-300 transition-colors">Espace restaurant</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-stone-300 mb-2 text-sm">Entreprise</h3>
                <ul className="space-y-1.5 text-stone-500">
                  <li><Link href="/a-propos" className="hover:text-stone-300 transition-colors">À propos</Link></li>
                  <li><Link href="/contact" className="hover:text-stone-300 transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-stone-300 mb-2 text-sm">Légal</h3>
                <ul className="space-y-1.5 text-stone-500">
                  <li><Link href="/cgu" className="hover:text-stone-300 transition-colors">CGU</Link></li>
                  <li><Link href="/confidentialite" className="hover:text-stone-300 transition-colors">Confidentialité</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-[#722F37] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-600">© {new Date().getFullYear()} Resto SaaS — Daloa, Côte d&apos;Ivoire</span>
            <a href="https://wa.me/2250575343846" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-500 hover:text-emerald-400 transition-colors">
              WhatsApp : +225 05 75 34 38 46
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
