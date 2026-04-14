# Resto SaaS

Plateforme de commande digitale par QR code pour restaurants (multi-tenant).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Firebase (Auth + Firestore + Storage)

## Démarrage

### 1. Configurer Firebase

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) et crée un projet.
2. Dans **Build > Authentication** → active la méthode **Email / Mot de passe**.
3. Dans **Build > Firestore Database** → crée une base en mode production, région `eur3` (ou proche de toi).
4. Dans **Project Settings > General > Your apps** → ajoute une application Web, récupère la config.
5. Copie `.env.local.example` en `.env.local` et remplis toutes les variables.

### 2. Règles Firestore (à coller dans l'onglet Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Lecture publique des restos actifs et de leur menu
    match /restaurants/{rid} {
      allow read: if true;
      allow write: if request.auth != null && isOwner(rid);

      match /categories/{cid} {
        allow read: if true;
        allow write: if request.auth != null && isOwner(rid);
      }

      match /products/{pid} {
        allow read: if true;
        // Autoriser la transaction de commande à décrémenter le stock
        allow update: if request.auth == null
          || (request.auth != null && isOwner(rid));
      }

      match /orders/{oid} {
        allow read: if request.auth != null && isOwner(rid);
        allow create: if true;
        allow update: if request.auth != null && isOwner(rid);
      }
    }

    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false; // créé côté admin uniquement
    }

    function isOwner(rid) {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.restaurantId == rid;
    }
  }
}
```

> Note : ces règles permettent la création de commande sans auth (QR code client) et autorisent la décrémentation du stock côté client. Durcir avec une Cloud Function pour la prod.

### 3. Créer un restaurant de test (manuellement dans la console Firestore)

**Collection `restaurants` → doc `chez-mama`** :
```json
{
  "slug": "chez-mama",
  "name": "Chez Mama",
  "address": "Yaoundé",
  "active": true,
  "subscriptionExpiresAt": null,
  "createdAt": <timestamp now>
}
```

**Sous-collection `restaurants/chez-mama/categories`** — 2 parents puis sous-catégories :
```json
{ "name": "Nourriture", "parentId": null, "order": 1 }
{ "name": "Boissons", "parentId": null, "order": 2 }
{ "name": "Plats locaux", "parentId": "<id de Nourriture>", "order": 1 }
{ "name": "Grillades", "parentId": "<id de Nourriture>", "order": 2 }
{ "name": "Jus naturels", "parentId": "<id de Boissons>", "order": 1 }
{ "name": "Eau", "parentId": "<id de Boissons>", "order": 2 }
```

**Sous-collection `restaurants/chez-mama/products`** :
```json
{
  "name": "Ndolé",
  "price": 2500,
  "categoryId": "<id Plats locaux>",
  "available": true,
  "stockQuantity": 20,
  "order": 1,
  "imageUrl": ""
}
{
  "name": "Coca 33cl",
  "price": 500,
  "categoryId": "<id Jus naturels>",
  "available": true,
  "stockQuantity": 50,
  "order": 1,
  "imageUrl": ""
}
```

### 4. Créer un compte staff

1. **Authentication → Users → Add user** : `owner@chez-mama.com` / mot de passe.
2. Copie l'UID généré.
3. **Firestore → collection `users` → doc `<UID>`** :
   ```json
   { "restaurantId": "chez-mama", "role": "owner" }
   ```

### 5. Lancer l'app

```bash
npm run dev
```

- Menu client : http://localhost:3000/r/chez-mama?table=1
- Dashboard : http://localhost:3000/dashboard/login

## Structure

```
src/
  app/
    r/[slug]/              # Expérience client (QR code)
      page.tsx             # Menu
      cart/                # Panier + validation
      order/[id]/          # Suivi commande temps réel
    dashboard/
      login/               # Connexion restaurant
      orders/              # Commandes temps réel + changement de statut
  lib/
    firebase.ts            # Init SDK
    restaurants.ts         # Queries resto/menu
    orders.ts              # createOrder (transaction stock atomique)
    cart.ts                # Panier localStorage
    format.ts              # Format FCFA
    auth-context.tsx       # Provider auth + resto courant
  types/
    index.ts               # Types Restaurant, Product, Order, etc.
```

## MVP implémenté

- [x] Menu client par QR code (table auto)
- [x] Panier localStorage isolé par table
- [x] Création de commande avec **transaction atomique** (vérifie + décrémente stock)
- [x] Abonnement expiré → service bloqué
- [x] Dashboard restaurant temps réel (onSnapshot)
- [x] Notification sonore à la nouvelle commande
- [x] Changement de statut : pending → preparing → ready → served
- [x] Suivi client de la commande en temps réel

## À faire (itération suivante)

- Gestion menu (CRUD produits) dans le dashboard
- Statistiques (CA jour/semaine/mois)
- Historique des commandes avec filtres
- Espace admin (gestion restos + abonnements)
- Impression ticket (ESC/POS via agent local)
- Upload images produits (Firebase Storage)
- Durcir les règles Firestore avec Cloud Functions
