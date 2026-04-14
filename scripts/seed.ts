import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const serviceAccount = JSON.parse(
  readFileSync(resolve(process.cwd(), "service-account.json"), "utf-8")
);

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

const RESTAURANT_SLUG = "chez-mama";
const RESTAURANT_NAME = "Chez Mama";
const OWNER_EMAIL = "owner@chez-mama.com";
const OWNER_PASSWORD = "Test1234!";
const SUPERADMIN_EMAIL = "admin@restosaas.com";
const SUPERADMIN_PASSWORD = "Admin1234!";

async function ensureUser(
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`→ Utilisateur déjà existant : ${email} (${existing.uid})`);
    return existing.uid;
  } catch {
    const user = await auth.createUser({ email, password, displayName });
    console.log(`✔ Utilisateur créé : ${email} (${user.uid})`);
    return user.uid;
  }
}

async function seed() {
  console.log("🌱 Seeding Firebase...\n");

  const uid = await ensureUser(OWNER_EMAIL, OWNER_PASSWORD, "Owner Chez Mama");
  const superUid = await ensureUser(
    SUPERADMIN_EMAIL,
    SUPERADMIN_PASSWORD,
    "Super Admin"
  );

  // 1. Restaurant
  const restoRef = db.collection("restaurants").doc(RESTAURANT_SLUG);
  await restoRef.set({
    slug: RESTAURANT_SLUG,
    name: RESTAURANT_NAME,
    address: "Yaoundé, Cameroun",
    phone: "+237000000000",
    active: true,
    subscriptionExpiresAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`✔ Restaurant : ${RESTAURANT_NAME}`);

  // 2. Clean old categories/products (idempotent)
  const oldCats = await restoRef.collection("categories").get();
  const oldProds = await restoRef.collection("products").get();
  const batch = db.batch();
  oldCats.forEach((d) => batch.delete(d.ref));
  oldProds.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  // 3. Categories — parents d'abord pour récupérer leurs IDs
  const catNourriture = await restoRef.collection("categories").add({
    name: "Nourriture",
    parentId: null,
    order: 1,
  });
  const catBoissons = await restoRef.collection("categories").add({
    name: "Boissons",
    parentId: null,
    order: 2,
  });

  const subPlats = await restoRef.collection("categories").add({
    name: "Plats locaux",
    parentId: catNourriture.id,
    order: 1,
  });
  const subGrillades = await restoRef.collection("categories").add({
    name: "Grillades",
    parentId: catNourriture.id,
    order: 2,
  });
  const subJus = await restoRef.collection("categories").add({
    name: "Jus naturels",
    parentId: catBoissons.id,
    order: 1,
  });
  const subEau = await restoRef.collection("categories").add({
    name: "Eau",
    parentId: catBoissons.id,
    order: 2,
  });
  console.log("✔ 6 catégories créées");

  // 4. Products
  const products = [
    { name: "Ndolé",          price: 2500, categoryId: subPlats.id,     stockQuantity: 20, order: 1 },
    { name: "Poulet DG",      price: 3500, categoryId: subPlats.id,     stockQuantity: 15, order: 2 },
    { name: "Poisson braisé", price: 4000, categoryId: subGrillades.id, stockQuantity: 10, order: 1 },
    { name: "Brochettes bœuf",price: 2000, categoryId: subGrillades.id, stockQuantity: 25, order: 2 },
    { name: "Jus de bissap",  price: 1000, categoryId: subJus.id,       stockQuantity: 30, order: 1 },
    { name: "Jus de gingembre", price: 1000, categoryId: subJus.id,     stockQuantity: 30, order: 2 },
    { name: "Eau 1.5L",       price: 500,  categoryId: subEau.id,       stockQuantity: 50, order: 1 },
    { name: "Coca 33cl",      price: 500,  categoryId: subEau.id,       stockQuantity: 60, order: 2 },
  ];
  for (const p of products) {
    await restoRef.collection("products").add({
      ...p,
      available: true,
      imageUrl: "",
    });
  }
  console.log(`✔ ${products.length} produits créés`);

  // 5. Lier user → restaurant
  await db.collection("users").doc(uid).set({
    restaurantId: RESTAURANT_SLUG,
    role: "owner",
    email: OWNER_EMAIL,
  });
  console.log(`✔ Lien user ↔ restaurant (${uid} → ${RESTAURANT_SLUG})`);

  // 6. Superadmin
  await db.collection("users").doc(superUid).set({
    role: "superadmin",
    email: SUPERADMIN_EMAIL,
  });
  console.log(`✔ Superadmin enregistré (${superUid})`);

  console.log("\n✅ Seed terminé !");
  console.log("\n┌──────────────────────────────────────────────────┐");
  console.log("│  OWNER RESTAURANT                                │");
  console.log("├──────────────────────────────────────────────────┤");
  console.log(`│  Email    : ${OWNER_EMAIL.padEnd(37)}│`);
  console.log(`│  Password : ${OWNER_PASSWORD.padEnd(37)}│`);
  console.log("│  URL      : /dashboard/login                     │");
  console.log("├──────────────────────────────────────────────────┤");
  console.log("│  SUPER ADMIN                                     │");
  console.log("├──────────────────────────────────────────────────┤");
  console.log(`│  Email    : ${SUPERADMIN_EMAIL.padEnd(37)}│`);
  console.log(`│  Password : ${SUPERADMIN_PASSWORD.padEnd(37)}│`);
  console.log("│  URL      : /admin/login                         │");
  console.log("├──────────────────────────────────────────────────┤");
  console.log("│  CLIENT                                          │");
  console.log("├──────────────────────────────────────────────────┤");
  console.log("│  URL      : /r/chez-mama?table=1                 │");
  console.log("└──────────────────────────────────────────────────┘");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  });
