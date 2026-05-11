// Seed Supabase. Usage : npm run seed
// Variables d'env requises (depuis .env.local) :
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  process.exit(1);
}

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RESTAURANT_SLUG = "chez-mama";
const RESTAURANT_NAME = "Chez Mama";
const OWNER_EMAIL = "owner@chez-mama.com";
const OWNER_PASSWORD = "Test1234!";
const SUPERADMIN_EMAIL = "admin@restosaas.com";
const SUPERADMIN_PASSWORD = "Admin1234!";

async function ensureUser(email: string, password: string): Promise<string> {
  // Cherche un user existant
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) {
    console.log(`→ Utilisateur déjà existant : ${email} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw error ?? new Error("Création user échouée");
  }
  console.log(`✔ Utilisateur créé : ${email} (${data.user.id})`);
  return data.user.id;
}

async function seed() {
  console.log("🌱 Seeding Supabase...\n");

  // 1. Comptes
  const ownerUid = await ensureUser(OWNER_EMAIL, OWNER_PASSWORD);
  const superUid = await ensureUser(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);

  // 2. Profile superadmin (upsert)
  await admin.from("profiles").upsert({
    id: superUid,
    role: "superadmin",
    email: SUPERADMIN_EMAIL,
  });
  console.log(`✔ Profile superadmin`);

  // 3. Restaurant (upsert par slug)
  const { data: existingRest } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", RESTAURANT_SLUG)
    .maybeSingle();

  let restaurantId: string;
  if (existingRest) {
    restaurantId = existingRest.id;
    console.log(`→ Restaurant déjà existant : ${RESTAURANT_NAME}`);
  } else {
    const { data: rest, error } = await admin
      .from("restaurants")
      .insert({
        slug: RESTAURANT_SLUG,
        name: RESTAURANT_NAME,
        address: "Yaoundé, Cameroun",
        phone: "+237000000000",
        active: true,
      })
      .select("id")
      .single();
    if (error || !rest) throw error;
    restaurantId = rest.id;
    console.log(`✔ Restaurant créé : ${RESTAURANT_NAME}`);
  }

  // 4. Profile owner (upsert)
  await admin.from("profiles").upsert({
    id: ownerUid,
    role: "owner",
    email: OWNER_EMAIL,
    restaurant_id: restaurantId,
  });
  console.log(`✔ Lien user ↔ restaurant`);

  // 5. Wipe puis recrée catégories & produits (idempotent)
  await admin.from("products").delete().eq("restaurant_id", restaurantId);
  await admin.from("categories").delete().eq("restaurant_id", restaurantId);

  const insertCat = async (
    name: string,
    parentId: string | null,
    order: number
  ): Promise<string> => {
    const { data, error } = await admin
      .from("categories")
      .insert({
        restaurant_id: restaurantId,
        name,
        parent_id: parentId,
        order,
      })
      .select("id")
      .single();
    if (error || !data) throw error;
    return data.id;
  };

  const catNourriture = await insertCat("Nourriture", null, 1);
  const catBoissons = await insertCat("Boissons", null, 2);
  const subPlats = await insertCat("Plats locaux", catNourriture, 1);
  const subGrillades = await insertCat("Grillades", catNourriture, 2);
  const subJus = await insertCat("Jus naturels", catBoissons, 1);
  const subEau = await insertCat("Eau", catBoissons, 2);
  console.log("✔ 6 catégories créées");

  const products = [
    { name: "Ndolé", price: 2500, category_id: subPlats, stock_quantity: 20, order: 1 },
    { name: "Poulet DG", price: 3500, category_id: subPlats, stock_quantity: 15, order: 2 },
    { name: "Poisson braisé", price: 4000, category_id: subGrillades, stock_quantity: 10, order: 1 },
    { name: "Brochettes bœuf", price: 2000, category_id: subGrillades, stock_quantity: 25, order: 2 },
    { name: "Jus de bissap", price: 1000, category_id: subJus, stock_quantity: 30, order: 1 },
    { name: "Jus de gingembre", price: 1000, category_id: subJus, stock_quantity: 30, order: 2 },
    { name: "Eau 1.5L", price: 500, category_id: subEau, stock_quantity: 50, order: 1 },
    { name: "Coca 33cl", price: 500, category_id: subEau, stock_quantity: 60, order: 2 },
  ];

  const { error: prodErr } = await admin.from("products").insert(
    products.map((p) => ({
      ...p,
      restaurant_id: restaurantId,
      available: true,
    }))
  );
  if (prodErr) throw prodErr;
  console.log(`✔ ${products.length} produits créés`);

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
