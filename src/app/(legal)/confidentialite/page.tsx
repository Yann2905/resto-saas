export const dynamic = "force-static";

export default function Confidentialite() {
  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-10 mb-2">
        Politique de Confidentialité
      </h1>
      <p className="text-sm text-stone-500 mb-10">
        Dernière mise à jour : 24 juin 2026
      </p>

      <div className="prose prose-invert prose-stone max-w-none space-y-8 text-stone-300 leading-relaxed text-[15px]">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            1. Introduction
          </h2>
          <p>
            Resto SaaS s&apos;engage à protéger la vie privée de ses
            utilisateurs. La présente Politique de Confidentialité explique
            quelles données nous collectons, comment nous les utilisons et
            quelles mesures nous prenons pour les protéger.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            2. Données collectées
          </h2>
          <h3 className="text-lg font-medium text-stone-200 mb-2">
            2.1 Données des restaurateurs
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Nom et adresse du restaurant</li>
            <li>Informations du menu (plats, prix, photos)</li>
            <li>Données de vente et statistiques</li>
          </ul>

          <h3 className="text-lg font-medium text-stone-200 mb-2 mt-4">
            2.2 Données des clients du restaurant
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Numéro de table (via QR code)</li>
            <li>Détails de la commande</li>
            <li>
              Numéro de téléphone (uniquement si fourni pour le paiement mobile)
            </li>
          </ul>
          <p className="mt-2">
            Les clients du restaurant n&apos;ont pas besoin de créer un compte
            pour passer commande. Aucune donnée personnelle n&apos;est collectée
            de manière obligatoire auprès des clients finaux.
          </p>

          <h3 className="text-lg font-medium text-stone-200 mb-2 mt-4">
            2.3 Données des serveurs
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Adresse email (créée par le propriétaire)</li>
            <li>Nom d&apos;affichage</li>
            <li>Zone de tables assignée</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            3. Utilisation des données
          </h2>
          <p>Les données collectées sont utilisées pour :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Fournir et maintenir le service de commande en ligne</li>
            <li>
              Envoyer des notifications de commande aux serveurs et
              propriétaires
            </li>
            <li>Générer des statistiques de vente pour le restaurateur</li>
            <li>Gérer les paiements et la facturation</li>
            <li>Améliorer la qualité du service</li>
            <li>Assurer le support technique</li>
          </ul>
          <p className="mt-2">
            Nous ne vendons jamais vos données à des tiers. Vos données ne sont
            pas utilisées à des fins publicitaires.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            4. Notifications push
          </h2>
          <p>
            Avec votre consentement, nous envoyons des notifications push pour
            vous alerter des nouvelles commandes. Vous pouvez désactiver ces
            notifications à tout moment dans les paramètres de votre navigateur
            ou de votre téléphone.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            5. Stockage et sécurité des données
          </h2>
          <p>
            Vos données sont stockées sur des serveurs sécurisés fournis par
            Supabase (infrastructure cloud). Les communications sont chiffrées
            via le protocole HTTPS (TLS).
          </p>
          <p>
            Les mots de passe sont hashés et ne sont jamais stockés en clair.
            L&apos;accès aux données est protégé par des politiques de sécurité
            au niveau de la base de données (Row Level Security).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            6. Durée de conservation
          </h2>
          <p>
            Les données des restaurateurs sont conservées pendant toute la durée
            de l&apos;abonnement et jusqu&apos;à 12 mois après la résiliation
            du compte, sauf demande de suppression anticipée.
          </p>
          <p>
            Les données de commande sont conservées pendant 24 mois pour
            permettre la consultation des statistiques historiques.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            7. Cookies et technologies similaires
          </h2>
          <p>
            La Plateforme utilise des cookies strictement nécessaires au
            fonctionnement du service (authentification, session). Nous
            n&apos;utilisons pas de cookies publicitaires ni de cookies de
            tracking tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            8. Vos droits
          </h2>
          <p>
            Conformément à la loi ivoirienne relative à la protection des
            données personnelles, vous disposez des droits suivants :
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-white">Droit d&apos;accès</strong> :
              consulter les données que nous détenons sur vous
            </li>
            <li>
              <strong className="text-white">Droit de rectification</strong> :
              corriger des données inexactes
            </li>
            <li>
              <strong className="text-white">Droit de suppression</strong> :
              demander la suppression de vos données
            </li>
            <li>
              <strong className="text-white">Droit de portabilité</strong> :
              recevoir vos données dans un format structuré
            </li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous via WhatsApp ou par email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            9. Sous-traitants
          </h2>
          <p>
            Nous faisons appel aux sous-traitants suivants pour le
            fonctionnement du service :
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-white">Supabase</strong> — hébergement de
              la base de données et authentification
            </li>
            <li>
              <strong className="text-white">Vercel</strong> — hébergement de
              l&apos;application web
            </li>
            <li>
              <strong className="text-white">Cloudinary</strong> — hébergement
              des images du menu
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            10. Modifications
          </h2>
          <p>
            Nous nous réservons le droit de modifier cette Politique de
            Confidentialité à tout moment. Les modifications seront publiées sur
            cette page avec la date de mise à jour.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            11. Contact
          </h2>
          <p>
            Pour toute question relative à la protection de vos données :
          </p>
          <ul className="list-none space-y-1 ml-2">
            <li>
              WhatsApp :{" "}
              <a
                href="https://wa.me/2250575343846"
                className="text-[#C8963E] hover:text-[#d4a94e]"
              >
                +225 05 75 34 38 46
              </a>
            </li>
            <li>
              Email :{" "}
              <a
                href="mailto:contact@resto-saas.com"
                className="text-[#C8963E] hover:text-[#d4a94e]"
              >
                contact@resto-saas.com
              </a>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
